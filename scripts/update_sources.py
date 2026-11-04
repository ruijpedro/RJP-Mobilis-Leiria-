#!/usr/bin/env python3
"""Atualiza catálogo de fontes Mobilis sem apagar ligações validadas em falhas de rede."""
from __future__ import annotations
import datetime
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/data/mobilis-sources.json"
HOSTS = {"mobilis.pt", "www.mobilis.pt"}

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag not in ("a", "img", "source"):
            return
        data = dict(attrs)
        for field in ("href", "src", "data-src"):
            if data.get(field):
                self.urls.append((data[field], data.get("alt", "")))

def classify_links(html: str, page: str):
    parser = Links()
    parser.feed(html)
    found = {"images": [], "pdfs": []}
    for raw, alt in parser.urls:
        url = urljoin(page, raw)
        p = urlparse(url)
        if p.scheme != "https" or p.hostname not in HOSTS:
            continue
        ext = p.path.lower().rsplit(".", 1)[-1]
        if ext not in ("pdf", "svg"):
            continue
        hint = (p.path + " " + alt).lower()
        if not any(word in hint for word in ("horarios", "horário", "horario", "pdf-linha", "linha-")):
            continue
        key = "pdfs" if ext == "pdf" else "images"
        if url not in found[key]:
            found[key].append(url)
    return found

def update_catalog(previous, fetch_page):
    updated = []
    checked = 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    entries = {str(item["id"]): item for item in previous.get("lines", [])}
    for number in range(1, 10):
        key = str(number)
        old = dict(entries.get(key, {}))
        page = f"https://mobilis.pt/linhas/linha-{number}/"
        item = {**old, "id": key, "page": page}
        try:
            links = classify_links(fetch_page(page), page)
            # Só substituir quando a página expõe referências úteis.
            if not (links["images"] or links["pdfs"]):
                raise ValueError("Página sem anexos reconhecíveis")
            item["images"] = links["images"] or old.get("images", [])
            item["pdfs"] = links["pdfs"] or old.get("pdfs", [])
            item["status"] = "checked"
            item["last_checked"] = now
            checked += 1
        except Exception:
            item["status"] = "cached-after-error" if old else "unavailable"
            item["images"] = old.get("images", [])
            item["pdfs"] = old.get("pdfs", [])
        updated.append(item)
    return {**previous, "last_checked": now, "lines": updated}, checked

def fetch_page(url):
    if urlparse(url).hostname not in HOSTS:
        raise ValueError("Domínio não autorizado")
    req = Request(url, headers={"User-Agent": "RJP-Mobilis-Leiria/1.10"})
    with urlopen(req, timeout=25) as response:
        if urlparse(response.geturl()).hostname not in HOSTS:
            raise ValueError("Redirecionamento não autorizado")
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Página demasiado grande")
        return raw.decode("utf-8", "replace")

if __name__ == "__main__":
    previous = json.loads(CATALOG.read_text(encoding="utf-8"))
    catalog, checked = update_catalog(previous, fetch_page)
    # Não tornar uma falha transitória da fonte pública num catálogo vazio.
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Fontes Mobilis consultadas: {checked}/9. Restantes preservadas em cache.")
