#!/usr/bin/env python3
"""Audita automaticamente as tabelas oficiais Mobilis.

Extrai texto legível dos SVG para revisão e regista as URLs encontradas.
NÃO converte tabelas em GTFS sem verificar a associação coluna/paragem/hora.
"""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {"mobilis.pt", "www.mobilis.pt"}
MAX_BYTES = 5_000_000
TIME_RE = re.compile(r"(?<!\d)(?:[01]?\d|2[0-9]):[0-5]\d(?!\d)")


def is_official(url):
    p = urlparse(url)
    return p.scheme == "https" and p.hostname in ALLOWED


def fetch(url):
    if not is_official(url):
        raise ValueError("Fonte externa ao domínio oficial Mobilis")
    request = Request(url, headers={"User-Agent": "RJP-Mobilis-ScheduleAudit/1.0"})
    with urlopen(request, timeout=35) as response:
        if not is_official(response.geturl()):
            raise ValueError("Redirecionamento fora do domínio oficial")
        content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError("Documento excede 5 MB")
        return content, response.headers.get("Content-Type", "")


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for key in ("href", "src", "data-src"):
            value = d.get(key, "")
            if value and (".svg" in value.lower() or ".pdf" in value.lower()):
                self.urls.append(value)


def svg_text(payload):
    root = ET.fromstring(payload)
    chunks = []
    for elem in root.iter():
        if elem.tag.rsplit("}", 1)[-1] in {"text", "tspan"}:
            value = " ".join(" ".join(elem.itertext()).split())
            if value and (not chunks or value != chunks[-1]):
                chunks.append(value)
    return chunks


def audit(catalog, out):
    report = {"status": "audit-only", "warning": "Não são horários GTFS verificados.",
              "lines": [], "provenance": str(catalog)}
    out.mkdir(parents=True, exist_ok=True)
    for line in catalog["lines"]:
        identifier = str(line["id"])
        record = {"line": identifier, "page": line["page"], "documents": [], "errors": []}
        try:
            page, _ = fetch(line["page"])
            parser = Refs()
            parser.feed(page.decode("utf-8", errors="replace"))
            refs = [urljoin(line["page"], x) for x in parser.urls]
        except Exception as exc:
            record["errors"].append("Página: " + str(exc))
            refs = []
        # Priorizar as tabelas de horários e esquemas de paragens reais;
        # não guardar SVG de logótipos e ícones decorativos.
        candidates = list(dict.fromkeys(refs if refs else (line.get("images", []) + line.get("pdfs", []))))
        candidates = [u for u in candidates if any(token in urlparse(u).path.lower()
                          for token in ("horarios-linha", "espinha-linha", "pdf-linha-", "linha-3.pdf"))]
        for url in candidates:
            if not is_official(url):
                continue
            try:
                payload, media = fetch(url)
                is_svg = urlparse(url).path.lower().endswith(".svg")
                extracted = svg_text(payload) if is_svg else []
                suffix = ".svg" if is_svg else ".pdf"
                kind = "horarios" if "horarios-linha" in url.lower() or suffix == ".pdf" else "paragens"
                folder = out / "fontes" / f"linha-{identifier}"
                folder.mkdir(parents=True, exist_ok=True)
                local = folder / f"{kind}-{len(record['documents']) + 1}{suffix}"
                local.write_bytes(payload)
                # A maioria dos SVG atuais usa glifos vetorizados, sem texto.
                # Tentar primeiro extrair texto do PDF, mantendo o original.
                if not is_svg:
                    try:
                        result = subprocess.run(["pdftotext", "-layout", str(local), "-"],
                            capture_output=True, text=True, timeout=45, check=True)
                        extracted = [v for v in result.stdout.splitlines() if v.strip()]
                    except (FileNotFoundError, subprocess.SubprocessError) as exc:
                        record["errors"].append("Extração PDF: " + str(exc))
                doc = {"url": url, "sha256": hashlib.sha256(payload).hexdigest(),
                       "bytes": len(payload), "contentType": media,
                       "kind": "svg" if is_svg else "pdf",
                       "textItems": len(extracted),
                       "timeTokens": len(TIME_RE.findall(" ".join(extracted))),
                       "requiresManualColumnReview": True,
                       "downloadedFile": str(local.relative_to(out)),
                       "machineReadableText": bool(extracted)}
                record["documents"].append(doc)
                if extracted:
                    (out / f"linha-{identifier}-{len(record['documents'])}.txt").write_text(
                        "\n".join(extracted) + "\n", encoding="utf-8")
            except Exception as exc:
                record["errors"].append(url + ": " + str(exc))
        report["lines"].append(record)
    (out / "relatorio.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = ["# Auditoria de horários oficiais Mobilis", "",
               "Os dados extraídos são apenas para revisão. Não são horários prontos para o planeador.", ""]
    for line in report["lines"]:
        summary.append(f"## Linha {line['line']}")
        summary.append(f"Documentos acessíveis: {len(line['documents'])}")
        for doc in line["documents"]:
            summary.append(f"- {doc['url']} — {doc['textItems']} linhas de texto, {doc['timeTokens']} referências horárias — ficheiro: {doc['downloadedFile']}")
        for error in line["errors"]:
            summary.append(f"- Erro: {error}")
        summary.append("")
    (out / "RESUMO.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default=str(ROOT / "public/data/mobilis-sources.json"))
    ap.add_argument("--out", default=str(ROOT / "audit/horarios"))
    args = ap.parse_args()
    result = audit(json.loads(Path(args.catalog).read_text(encoding="utf-8")), Path(args.out))
    print("Auditoria concluída:", len(result["lines"]), "linhas. Sem conversão automática não verificada.")
