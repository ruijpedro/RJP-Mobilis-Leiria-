#!/usr/bin/env python3
"""Converte viagens Mobilis REVISADAS para GTFS. Não infere horários nem paragens.
Uso: python scripts/build_reviewed_gtfs.py dados/reviewed-trips.json public/data/mobilis-validated.gtfs.zip
"""
import csv, datetime as dt, io, json, pathlib, re, sys, zipfile

TIME=re.compile(r"^(?:[0-2]?[0-9]|3[0-9]):[0-5][0-9](?::[0-5][0-9])?$")
DATE=re.compile(r"^20\d{6}$")

def valid_time(t):
 if not isinstance(t,str) or not TIME.fullmatch(t): return False
 h=int(t.split(':')[0]);return h <= 29

def sec(t):
 h,m,*s=map(int,t.split(':'));return h*3600+m*60+(s[0] if s else 0)

def build(obj):
 if obj.get('operator')!='Mobilis Leiria': raise ValueError('Operador não confirmado')
 stops=obj.get('stops',[]); trips=obj.get('trips',[])
 if not stops or not trips: raise ValueError('Sem paragens ou viagens validadas')
 sid={}
 for s in stops:
  if not s.get('id') or not s.get('name') or s['id'] in sid:raise ValueError('Paragem sem ID/nome ou duplicada')
  lat,lon=float(s['lat']),float(s['lon'])
  if not (39.5<lat<40.2 and -9.2<lon<-8.3):raise ValueError('Paragem fora da área de Leiria')
  sid[s['id']]=s
 tables={k:[] for k in ['agency','stops','routes','trips','stop_times','calendar_dates']}
 tables['agency']=[{'agency_id':'mobilis','agency_name':'Mobilis Leiria','agency_url':'https://mobilis.pt/','agency_timezone':'Europe/Lisbon'}]
 for s in stops:tables['stops'].append({'stop_id':s['id'],'stop_name':s['name'],'stop_lat':s['lat'],'stop_lon':s['lon']})
 routes={}; tripids=set()
 for t in trips:
  if not t.get('approved') or not t.get('source_url','').startswith('https://mobilis.pt/') or not re.fullmatch('[0-9a-f]{64}',t.get('source_sha256','')):raise ValueError('Viagem sem revisão ou fonte oficial rastreável')
  tid=t.get('id'); number=str(t.get('line','')).strip(); date=t.get('service_date',''); pts=t.get('stops',[])
  if not tid or tid in tripids or not re.fullmatch(r'[0-9]{1,2}',number) or not DATE.fullmatch(date):raise ValueError('ID, linha ou data inválidos')
  tripids.add(tid)
  try:dt.datetime.strptime(date,'%Y%m%d')
  except ValueError:raise ValueError('Data de circulação inválida')
  if len(pts)<2:raise ValueError('Viagem sem pelo menos duas paragens')
  last=-1
  for i,point in enumerate(pts,1):
   if point.get('stop_id') not in sid or not valid_time(point.get('arrival','')) or not valid_time(point.get('departure','')):raise ValueError('Paragem ou horário inválido')
   a,d=sec(point['arrival']),sec(point['departure'])
   if a<last or d<a:raise ValueError('Horários não cronológicos')
   last=d
   tables['stop_times'].append({'trip_id':tid,'arrival_time':point['arrival'],'departure_time':point['departure'],'stop_id':point['stop_id'],'stop_sequence':i})
  routes[number]={'route_id':'mobilis-'+number,'agency_id':'mobilis','route_short_name':number,'route_long_name':'Mobilis '+number,'route_type':3}
  service='service-'+date
  tables['trips'].append({'route_id':'mobilis-'+number,'service_id':service,'trip_id':tid,'trip_headsign':t.get('headsign','')})
  if not any(c['service_id']==service for c in tables['calendar_dates']): tables['calendar_dates'].append({'service_id':service,'date':date,'exception_type':1})
 tables['routes']=list(routes.values())
 return tables

def write_gtfs(obj,filename):
 tables=build(obj)
 fields={'agency':['agency_id','agency_name','agency_url','agency_timezone'],'stops':['stop_id','stop_name','stop_lat','stop_lon'],'routes':['route_id','agency_id','route_short_name','route_long_name','route_type'],'trips':['route_id','service_id','trip_id','trip_headsign'],'stop_times':['trip_id','arrival_time','departure_time','stop_id','stop_sequence'],'calendar_dates':['service_id','date','exception_type']}
 with zipfile.ZipFile(filename,'w',zipfile.ZIP_DEFLATED) as z:
  for key,rows in tables.items():
   buff=io.StringIO();w=csv.DictWriter(buff,fieldnames=fields[key]);w.writeheader();w.writerows(rows)
   z.writestr(key+'.txt',buff.getvalue())
 return len(tables['trips']),len(tables['stops'])

if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Uso: python scripts/build_reviewed_gtfs.py ENTRADA.json SAIDA.zip')
 obj=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf8'))
 print('Viagens e paragens aprovadas:',write_gtfs(obj,sys.argv[2]))
