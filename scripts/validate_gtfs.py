#!/usr/bin/env python3
"""Valida estrutura GTFS Mobilis sem publicar horários não confirmados."""
import csv,io,sys,zipfile,urllib.request,json,datetime
from urllib.parse import urlparse
REQUIRED={"agency.txt":{"agency_name","agency_timezone"},"routes.txt":{"route_id","route_short_name"},"trips.txt":{"route_id","service_id","trip_id"},"stops.txt":{"stop_id","stop_name","stop_lat","stop_lon"},"stop_times.txt":{"trip_id","stop_id","stop_sequence","arrival_time","departure_time"}}
def inspect(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  files={name.rsplit('/',1)[-1].lower():name for name in z.namelist() if not name.endswith('/')}
  rows={}
  for name,cols in REQUIRED.items():
   if name not in files: raise ValueError('Falta '+name)
   with z.open(files[name]) as stream:
    text=io.TextIOWrapper(stream,encoding='utf-8-sig')
    reader=csv.DictReader(text)
    if not cols.issubset(set(reader.fieldnames or [])):raise ValueError('Colunas em falta: '+name)
    rows[name]=list(reader)
    if not rows[name]:raise ValueError('Sem dados: '+name)
  agencies=' '.join(str(r.get('agency_name','')) for r in rows['agency.txt']).casefold()
  if not any(token in agencies for token in ('mobilis','leiria','rodoviária do lis','rodoviaria do lis')):raise ValueError('Operador Mobilis/Leiria não confirmado no agency.txt')
  routeids={x['route_id'] for x in rows['routes.txt']}; trips={x['trip_id'] for x in rows['trips.txt']}; stops={x['stop_id'] for x in rows['stops.txt']}
  if not all(t['route_id'] in routeids for t in rows['trips.txt']):raise ValueError('Viagens sem linha')
  if not all(t['trip_id'] in trips and t['stop_id'] in stops for t in rows['stop_times.txt']):raise ValueError('Passagens com referências inexistentes')
  if not any(k in files for k in ('calendar.txt','calendar_dates.txt')):raise ValueError('Calendário GTFS em falta')
  if not any(x.get('agency_timezone')=='Europe/Lisbon' for x in rows['agency.txt']):raise ValueError('Fuso horário não confirmado')
  for stop in rows['stops.txt']:
   lat,lon=float(stop['stop_lat']),float(stop['stop_lon'])
   if not (39.0<=lat<=40.5 and -9.5<=lon<=-7.5):raise ValueError('Coordenadas fora da região de Leiria')
  return {'routes':len(routeids),'stops':len(stops),'trips':len(trips),'stopTimes':len(rows['stop_times.txt'])}
if __name__=='__main__':
 url=sys.argv[1]
 if urlparse(url).scheme!='https':raise SystemExit('Exige HTTPS')
 req=urllib.request.Request(url,headers={'User-Agent':'RJP-Mobilis-Leiria/2.5'})
 with urllib.request.urlopen(req,timeout=35) as response:
  data=response.read(40_000_001)
 if len(data)>40_000_000:raise SystemExit('Ficheiro excede 40 MB')
 result=inspect(data)
 print(json.dumps(result,ensure_ascii=False))
