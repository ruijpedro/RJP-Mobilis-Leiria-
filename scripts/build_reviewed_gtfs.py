#!/usr/bin/env python3
"""Gera GTFS apenas de uma tabela CSV manualmente revista.

Entrada: data/reviewed-departures.csv, colunas:
line,service_id,trip_id,stop_id,stop_name,stop_lat,stop_lon,stop_sequence,arrival_time,departure_time,headsign,start_date,end_date,days,source_url,reviewed

'days' = 7 caracteres, segunda a domingo (1 ativo, 0 inativo).
'reviewed' deve ser 'yes' em TODAS as linhas; fontes oficiais verificáveis.
Não há extrapolação de horários, interpolação ou associação OSM automática.
"""
import csv
import io
import pathlib
import re
import sys
import zipfile
from collections import defaultdict
from urllib.parse import urlparse

FIELDS = ['line','service_id','trip_id','stop_id','stop_name','stop_lat','stop_lon','stop_sequence','arrival_time','departure_time','headsign','start_date','end_date','days','source_url','reviewed']
BASE = pathlib.Path('data/reviewed-departures.csv')
OUTPUT = pathlib.Path('public/data/mobilis-reviewed-gtfs.zip')

def valid_time(value):
    match = re.fullmatch(r'(\d{1,2}):([0-5]\d):([0-5]\d)', value)
    return bool(match and int(match.group(1)) <= 47)

def convert(source=BASE, output=OUTPUT):
    with open(source, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not set(FIELDS).issubset(reader.fieldnames or []):
            raise ValueError('Colunas obrigatórias em falta no CSV revisto')
        rows = list(reader)
    if not rows:
        raise ValueError('CSV revisto vazio; não gerar GTFS')
    stops, trips, services, routes = {}, {}, {}, {}
    times, trip_times = [], defaultdict(list)
    for index, r in enumerate(rows, 2):
        if r['reviewed'].lower().strip() != 'yes':
            raise ValueError(f'Linha CSV {index}: horário não revisto')
        if not (urlparse(r['source_url']).scheme == 'https' and urlparse(r['source_url']).hostname in ('mobilis.pt','www.mobilis.pt')):
            raise ValueError(f'Linha CSV {index}: fonte oficial Mobilis obrigatória')
        if not re.fullmatch(r'\d{8}',r['start_date']) or not re.fullmatch(r'\d{8}',r['end_date']) or r['start_date']>r['end_date']:
            raise ValueError(f'Linha CSV {index}: datas inválidas')
        if not re.fullmatch('[01]{7}',r['days']):
            raise ValueError(f'Linha CSV {index}: dias devem ser 7 algarismos binários')
        if not valid_time(r['arrival_time']) or not valid_time(r['departure_time']):
            raise ValueError(f'Linha CSV {index}: horas inválidas')
        if not r['stop_id'] or not r['trip_id'] or not r['service_id'] or not r['line']:
            raise ValueError(f'Linha CSV {index}: identificadores em falta')
        lat,lon=float(r['stop_lat']),float(r['stop_lon'])
        if not (39.4<=lat<=40.1 and -9.1<=lon<=-8.3):
            raise ValueError(f'Linha CSV {index}: coordenadas fora da região de Leiria')
        seq=int(r['stop_sequence'])
        if seq<1:
            raise ValueError(f'Linha CSV {index}: sequência inválida')
        stop = {'stop_id':r['stop_id'],'stop_name':r['stop_name'],'stop_lat':r['stop_lat'],'stop_lon':r['stop_lon']}
        if r['stop_id'] in stops and stops[r['stop_id']]!=stop:
            raise ValueError(f'Linha CSV {index}: paragem contraditória')
        stops[r['stop_id']] = stop
        key=(r['line'],r['headsign'])
        routes[r['line']]={'route_id':r['line'],'route_short_name':r['line'],'route_long_name':f'Mobilis {r["line"]}','route_type':'3'}
        trip={'trip_id':r['trip_id'],'route_id':r['line'],'service_id':r['service_id'],'trip_headsign':r['headsign']}
        if r['trip_id'] in trips and trips[r['trip_id']]!=trip:
            raise ValueError(f'Linha CSV {index}: viagem contraditória')
        trips[r['trip_id']]=trip
        cal={'service_id':r['service_id'],'monday':r['days'][0],'tuesday':r['days'][1],'wednesday':r['days'][2],'thursday':r['days'][3],'friday':r['days'][4],'saturday':r['days'][5],'sunday':r['days'][6],'start_date':r['start_date'],'end_date':r['end_date']}
        if r['service_id'] in services and services[r['service_id']]!=cal:
            raise ValueError(f'Linha CSV {index}: serviço contraditório')
        services[r['service_id']]=cal
        times.append({'trip_id':r['trip_id'],'arrival_time':r['arrival_time'],'departure_time':r['departure_time'],'stop_id':r['stop_id'],'stop_sequence':seq})
        trip_times[r['trip_id']].append((seq,r['arrival_time'],r['departure_time']))
    for trip_id, occurrences in trip_times.items():
        sorted_rows=sorted(occurrences)
        if len({x[0] for x in sorted_rows})!=len(sorted_rows):
            raise ValueError(f'Viagem {trip_id}: sequências duplicadas')
        values=[int(t[:2])*3600+int(t[3:5])*60+int(t[6:]) for row in sorted_rows for t in row[1:]]
        if values!=sorted(values):
            raise ValueError(f'Viagem {trip_id}: horários não cronológicos')
    tables={
        'stops.txt':list(stops.values()),'routes.txt':list(routes.values()),
        'trips.txt':list(trips.values()),'stop_times.txt':sorted(times,key=lambda x:(x['trip_id'],x['stop_sequence'])),
        'calendar.txt':list(services.values())
    }
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for filename,entries in tables.items():
            stream=io.StringIO()
            writer=csv.DictWriter(stream,fieldnames=list(entries[0]))
            writer.writeheader();writer.writerows(entries)
            z.writestr(filename,stream.getvalue())
    return len(trips),len(stops)

if __name__=='__main__':
    try:
        trips,stops=convert()
        print(f'GTFS revisto: {trips} viagens, {stops} paragens: {OUTPUT}')
    except (ValueError,OSError) as exc:
        sys.exit(f'Não gerado: {exc}')
