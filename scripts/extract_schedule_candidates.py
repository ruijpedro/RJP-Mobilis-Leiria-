#!/usr/bin/env python3
"""Cria fila de revisão de horários Mobilis; NUNCA alimenta o planeador diretamente.
Só descarrega URLs oficiais previamente verificadas no índice. Usa pypdf quando disponível.
"""
import hashlib, json, pathlib, re, urllib.request, urllib.parse, datetime
BASE=pathlib.Path('public/data')
index=json.loads((BASE/'mobilis-sources.json').read_text(encoding='utf-8'))
items=[]
try:
 from pypdf import PdfReader
except ImportError:
 PdfReader=None
for line in index.get('officialLines',[]):
 for item in line.get('timetables',[]):
  if not item.get('reachable') or item.get('format')!='PDF': continue
  url=item['url']; host=urllib.parse.urlparse(url).hostname
  if host not in ('mobilis.pt','www.mobilis.pt'): continue
  record={'line':line['number'],'url':url,'verified':False,'requiresReview':True,'status':'sem_extração','timesCandidate':[]}
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'RJP-Mobilis-Leiria/2.8'})
   with urllib.request.urlopen(req,timeout=20) as response: data=response.read(10_000_001)
   if len(data)>10_000_000 or not data.startswith(b'%PDF-'): raise ValueError('PDF não válido')
   record['sha256']=hashlib.sha256(data).hexdigest()
   if PdfReader is None: record['status']='instalar_pypdf'
   else:
    import io
    reader=PdfReader(io.BytesIO(data)); text='\n'.join(page.extract_text() or '' for page in reader.pages[:12]);
    record['timesCandidate']=list(dict.fromkeys(re.findall(r'(?<!\d)(?:[01]?\d|2[0-3]):[0-5]\d(?!\d)',text)))[:250]
    record['status']='aguarda_revisão' if record['timesCandidate'] else 'sem_horas_legíveis'
  except Exception as exc: record['status']='erro';record['error']=str(exc)[:160]
  items.append(record)
result={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'approvedForRouting':False,'note':'Horas extraídas sem a relação linha/paragem/sentido/coluna NÃO podem ser usadas para calcular viagens. Exigem revisão humana.', 'documents':items}
(BASE/'mobilis-review-queue.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Documentos a rever:',len(items))
