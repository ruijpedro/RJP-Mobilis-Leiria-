#!/usr/bin/env python3
"""Audita páginas e anexos oficiais; não transforma PDFs em viagens sem validação."""
import json, datetime, urllib.request, urllib.parse, pathlib, os, re
from validate_gtfs import inspect
from html.parser import HTMLParser

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.items=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag in ('a','img'):
            for field in ('href','src','data-src'):
                u=d.get(field)
                if u: self.items.append((u, d.get('alt','')))

def request(url):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 RJP-Mobilis-Leiria/1.8'})
        with urllib.request.urlopen(req,timeout=18) as r:
            return r.status, r.read(3_000_000),r.headers.get('Content-Type','')
    except Exception: return 0,b'',''

path=pathlib.Path('public/data/mobilis-sources.json')
index=json.loads(path.read_text(encoding='utf-8'))
index['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
# Preservar a última fonte validada em caso de erro transitório.
last_verified=index.get('feedUrl') if index.get('feedCoverage') else None
last_coverage=index.get('feedCoverage') if last_verified else None
for line in index['officialLines']:
    status,content,ctype=request(line['url'])
    line['reachable']=status==200
    line['timetables']=[]
    if status!=200: continue
    html=content.decode('utf-8','replace')
    parser=Links(); parser.feed(html)
    seen=set()
    for raw, alt in parser.items:
        url=urllib.parse.urljoin(line['url'],raw)
        if urllib.parse.urlparse(url).netloc not in ('mobilis.pt','www.mobilis.pt'):continue
        if not re.search(r'\.(pdf|svg|png|jpe?g|webp)(?:\?|$)',url,re.I):continue
        # Evita tratar logótipos, banners e fotografias como horários.
        hint=(url+' '+alt).lower()
        if not any(term in hint for term in ('horario','horário','linha-','linha_','linha ')):continue
        if url in seen:continue
        seen.add(url)
        st,payload,mime=request(url)
        ext=url.lower().split('?')[0].rsplit('.',1)[-1]
        signatures={'pdf':payload.startswith(b'%PDF-'),'svg':b'<svg' in payload[:2000], 'png':payload.startswith(b'\x89PNG\r\n\x1a\n'),'jpg':payload.startswith(b'\xff\xd8\xff'),'jpeg':payload.startswith(b'\xff\xd8\xff'),'webp':payload.startswith(b'RIFF') and payload[8:12]==b'WEBP'}
        good=st==200 and signatures.get(ext,False) and len(payload)>100
        line['timetables'].append({'url':url,'reachable':bool(good),'status':st,'format':ext.upper(),'label':alt[:120] or 'Documento publicado pelo operador','structured':False})
    line['timetables']=line['timetables'][:20]
# GTFS só se foi identificado, publicado e validado fora deste auditor.
verified=os.environ.get('MOBILIS_VERIFIED_GTFS_URL','').strip()
if verified.startswith('https://') and urllib.parse.urlparse(verified).path.lower().endswith('.zip'):
    try:
        req=urllib.request.Request(verified,headers={'User-Agent':'RJP-Mobilis-Leiria/2.5'})
        with urllib.request.urlopen(req,timeout=35) as response:
            data=response.read(40_000_001)
            status=response.status if len(data)<=40_000_000 else 0
    except Exception:
        status, data=0,b''
    try:
        if status!=200: raise ValueError('Descarregamento falhou')
        index['feedCoverage']=inspect(data)
        index['feedUrl']=verified
    except Exception as exc:
        index['feedUrl']=last_verified
        index['feedCoverage']=last_coverage
        index['feedError']=str(exc)
else:
    index['feedUrl']=last_verified
    index['feedCoverage']=last_coverage
index['note']='Imagens e PDFs identificados não constituem horários estruturados nem ativam o planeador. Fontes verificadas. Ligações de ficheiros indisponíveis não são usadas para calcular horários. GTFS só publicado após validação estrutural e de operador.'
path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Linhas acessíveis:',sum(bool(x.get('reachable')) for x in index['officialLines']))
print('Anexos acessíveis:',sum(sum(bool(a['reachable']) for a in x.get('timetables',[])) for x in index['officialLines']))
print('GTFS confirmado:',bool(index['feedUrl']))
