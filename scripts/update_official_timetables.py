#!/usr/bin/env python3
"""Descobre ligações oficiais Mobilis às tabelas de todas as nove linhas.
Não converte imagens/PDFs em partidas GTFS: apenas publica fontes verificáveis.
"""
from __future__ import annotations
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"public/data/mobilis-sources.json"
BASE="https://mobilis.pt/linhas/linha-{}/"
HEADERS={"User-Agent":"RJP-Mobilis-Source-Catalog/1.0 (horarios publicos)"}
DIRECTION_HINTS=("horario","horário","timetable","schedule","part","sentido")
MAX_SIZE=1_500_000

class MediaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images=[]
        self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=="img":
            self.images.append(attrs)
        elif tag=="a":
            self.links.append(attrs)

def allowed_url(page,url,extensions):
    if not url or str(url).startswith(("data:","javascript:")):return None
    candidate=urljoin(page,url.strip())
    u=urlparse(candidate)
    if u.scheme!="https" or u.hostname not in ("mobilis.pt","www.mobilis.pt"):return None
    if not any(u.path.lower().endswith(e) for e in extensions):return None
    return candidate

def parse_page(page,html):
    parser=MediaParser();parser.feed(html)
    images=[];pdfs=[]
    for img in parser.images:
        description=" ".join(str(img.get(k,"")) for k in ("alt","title","src","data-src","data-lazy-src"))
        if not any(h in description.lower() for h in DIRECTION_HINTS):continue
        for key in ("data-src","data-lazy-src","src"):
            url=allowed_url(page,img.get(key),(".svg",".png",".jpg",".jpeg",".webp"))
            if url and url not in images:images.append(url)
    for link in parser.links:
        url=allowed_url(page,link.get("href"),(".pdf",))
        if url and url not in pdfs:pdfs.append(url)
    return images,pdfs

def get_html(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=25) as response:
        if response.status!=200:raise ValueError(f"HTTP {response.status}")
        data=response.read(MAX_SIZE+1)
        if len(data)>MAX_SIZE:raise ValueError("HTML demasiado grande")
        return data.decode("utf-8","replace")

def main():
    try:old=json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError,ValueError):old={}
    previous={str(x["id"]):x for x in old.get("lines",[]) if "id" in x}
    now=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result=[]
    for n in range(1,10):
        lid=str(n);page=BASE.format(n)
        cached=previous.get(lid,{})
        try:
            html=get_html(page)
            images,pdfs=parse_page(page,html)
            # If parsing fails to identify timetable media, do not mark
            # the line as successfully digitized/verified.
            if not (images or pdfs):raise ValueError("Nenhuma tabela PDF/imagem encontrada")
            result.append(dict(id=lid,page=page,images=images,pdfs=pdfs,status="checked",
                               last_checked=now,format="official-reference-only"))
            print(f"Linha {n}: {len(images)} tabela(s) e {len(pdfs)} PDF(s)")
        except Exception as exc:
            print(f"Linha {n}: falha — {exc}")
            known=bool(cached.get("images") or cached.get("pdfs"))
            result.append(dict(id=lid,page=page,images=cached.get("images",[]),
                               pdfs=cached.get("pdfs",[]),
                               status="cached-after-error" if known else "unavailable",
                               last_checked=cached.get("last_checked"),
                               format="official-reference-only"))
    output={"note":"Fontes oficiais das 9 linhas Mobilis. Imagens e PDF não equivalem a GTFS nem provam o horário de uma paragem específica.", 
            "last_checked":now,"lines":result}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Catálogo: {sum(x['status']=='checked' for x in result)}/9 páginas verificadas")

if __name__=="__main__":
    main()
