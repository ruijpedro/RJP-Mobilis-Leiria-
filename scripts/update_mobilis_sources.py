#!/usr/bin/env python3
"""Consulta páginas oficiais Mobilis e publica apenas ligações comprovadas.

Não interpreta horários em imagens/PDF nem constrói GTFS sem validação humana.
Em falhas de rede mantém o catálogo anterior, nunca publica dados inventados.
"""
import datetime
import html
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

BASE = 'https://mobilis.pt'
OUT = Path('public/data/mobilis-sources.json')

class Anchors(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        d = dict(attrs)
        if d.get('href'):
            self.links.append(d['href'])

def source_links(page):
    parser = Anchors()
    parser.feed(page)
    urls = []
    for link in parser.links:
        url = urllib.parse.urljoin(BASE, html.unescape(link))
        host = urllib.parse.urlparse(url).hostname or ''
        if host in ('mobilis.pt', 'www.mobilis.pt') and re.search(r'\.pdf(?:\?|$)', url, re.I):
            if url not in urls:
                urls.append(url)
    return urls

def main():
    previous = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'lines': []}
    old = {str(line['id']): line for line in previous.get('lines', [])}
    entries = []
    for n in range(1, 10):
        uri = f'{BASE}/linhas/linha-{n}/'
        entry = {'id': str(n), 'page': uri, 'pdfs': [], 'status': 'unchecked'}
        try:
            req = urllib.request.Request(uri, headers={'User-Agent': 'RJP-Mobilis-Leiria/1.5 (public-data-audit)'})
            with urllib.request.urlopen(req, timeout=25) as response:
                page = response.read(2_000_000).decode('utf-8', errors='replace')
            entry['pdfs'] = source_links(page)
            entry['status'] = 'checked'
        except Exception as exc:
            if str(n) in old:
                entry = old[str(n)]
                entry['status'] = 'cached-after-error'
            print(f'Linha {n}: {type(exc).__name__} — não atualizar fontes')
        entries.append(entry)
    if not any(e['status'] == 'checked' for e in entries):
        raise SystemExit('Nenhuma página consultada. Mantido o catálogo anterior.')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'last_checked': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'lines': entries,
         'note': 'Ligações para consulta; horários ainda não foram transcritos/validados.'}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Catálogo oficial atualizado: {len(entries)} linhas')

if __name__ == '__main__':
    main()
