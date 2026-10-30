#!/usr/bin/env python3
"""Audita páginas e anexos oficiais; não transforma PDFs em viagens sem validação."""
import json, datetime, urllib.request, urllib.parse, pathlib, os, re
from html.parser import HTMLParser

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.items=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag in ('a','img'):
            u=d.get('href') or d.get('src')
            if u: self.items.append(u)

def request(url):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 RJP-Mobilis-Leiria/1.8'})
        with urllib.request.urlopen(req,timeout=18) as r:
            return r.status, r.read(3_000_000),r.headers.get('Content-Type','')
    except Exception: return 0,b'',''

path=pathlib.Path('public/data/mobilis-sources.json')
index=json.loads(path.read_text(encoding='utf-8'))
index['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
for line in index['officialLines']:
    status,content,ctype=request(line['url'])
    line['reachable']=status==200
    line['timetables']=[]
    if status!=200: continue
    html=content.decode('utf-8','replace')
    parser=Links(); parser.feed(html)
    seen=set()
    for raw in parser.items:
        url=urllib.parse.urljoin(line['url'],raw)
        if urllib.parse.urlparse(url).netloc not in ('mobilis.pt','www.mobilis.pt'):continue
        if not re.search(r'\.(pdf|svg)(?:\?|$)',url,re.I):continue
        if not ('horario' in url.lower() or 'linha' in url.lower() or url.lower().endswith('.pdf')):continue
        if url in seen:continue
        seen.add(url)
        st,_,_=request(url)
        line['timetables'].append({'url':url,'reachable':st==200})
    line['timetables']=line['timetables'][:20]
# GTFS só se foi identificado, publicado e validado fora deste auditor.
verified=os.environ.get('MOBILIS_VERIFIED_GTFS_URL','').strip()
if verified.startswith('https://') and verified.lower().endswith('.zip'):
    index['feedUrl']=verified
else:
    index['feedUrl']=None
index['note']='Fontes verificadas. Ligações de ficheiros indisponíveis não são usadas para calcular horários. GTFS não confirmado.'
path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Linhas acessíveis:',sum(bool(x.get('reachable')) for x in index['officialLines']))
print('Anexos acessíveis:',sum(sum(bool(a['reachable']) for a in x.get('timetables',[])) for x in index['officialLines']))
print('GTFS confirmado:',bool(index['feedUrl']))
