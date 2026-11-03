#!/usr/bin/env python3
"""Cria transcrições verificáveis dos PDFs oficiais para revisão humana.

Extrai texto do PDF e, quando é insuficiente, tenta OCR. Não cria horários
GTFS automaticamente: a associação de uma hora à coluna/paragem tem de
ser confirmada visualmente nas fontes.
"""
from __future__ import annotations
import json
import re
import subprocess
from pathlib import Path

ROOT = Path("audit/horarios")
TIME = re.compile(r"(?<!\d)(?:[01]?\d|2[0-9]):[0-5]\d(?!\d)")
OCR_MAX_PAGES = 4

def run(args, timeout=180):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True)
    return result.stdout

def ocr_pdf(path, output):
    try:
        n = int(run(["pdfinfo", str(path)], 25).split("Pages:")[1].splitlines()[0].strip())
    except Exception:
        n = 1
    texts = []
    for page in range(1, min(n, OCR_MAX_PAGES) + 1):
        prefix = output / f"imagem-pagina-{page}"
        run(["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile", "-r", "180",
             "-gray", "-png", str(path), str(prefix)], 120)
        png = prefix.with_suffix(".png")
        try:
            plain = run(["tesseract", str(png), "stdout", "-l", "por+eng", "--psm", "11"], 120)
            tsv = run(["tesseract", str(png), "stdout", "-l", "por+eng", "--psm", "11", "tsv"], 120)
            (output / f"pagina-{page}-ocr.tsv").write_text(tsv, encoding="utf-8")
            texts.append(f"--- PÁGINA {page} ---\n{plain}")
        finally:
            png.unlink(missing_ok=True)
    return "\n".join(texts), n

def main():
    summary = []
    for path in sorted((ROOT / "fontes").glob("linha-*/*.pdf")):
        result_dir = ROOT / "transcricoes" / path.parent.name
        result_dir.mkdir(parents=True, exist_ok=True)
        name = path.stem
        info = {"line": path.parent.name, "file": str(path.relative_to(ROOT)), "extraction": None,
                "timeTokens": 0, "textLength": 0, "reviewRequired": True}
        try:
            text = run(["pdftotext", "-layout", str(path), "-"], 90)
            tokens = TIME.findall(text)
            if len(tokens) < 6:
                text, pages = ocr_pdf(path, result_dir)
                info["extraction"] = "OCR"
                info["pagesInDocument"] = pages
                info["pagesProcessed"] = min(pages, OCR_MAX_PAGES)
            else:
                info["extraction"] = "embedded-text"
            info["textLength"] = len(text)
            info["timeTokens"] = len(TIME.findall(text))
            (result_dir / (name + ".txt")).write_text(text, encoding="utf-8")
        except Exception as exc:
            info["error"] = str(exc)
        summary.append(info)
    (ROOT / "transcricoes" / "indice.json").write_text(
        json.dumps({"status": "review-required", "documents": summary}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    for item in summary:
        print(item["line"], item.get("extraction"), item.get("timeTokens"), "horas", item.get("error", ""))
    print("ATENÇÃO: horas extraídas não são ligações paragem-hora confirmadas.")

if __name__ == "__main__":
    main()
