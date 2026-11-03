#!/usr/bin/env python3
"""Verifica os dados cartográficos OSM incluídos na WebApp/APK."""
import json
from pathlib import Path

root=Path('public/data')
stops=json.loads((root/'osm-stops-leiria.json').read_text(encoding='utf-8'))
assert isinstance(stops,list) and len(stops)>=20, 'Base de paragens OSM ausente/incompleta'
valid=0
for stop in stops:
    try:
        lat=float(stop['stop_lat']); lon=float(stop['stop_lon'])
        if 39.5<lat<40.0 and -9.1<lon<-8.5:valid+=1
    except (TypeError,ValueError,KeyError):
        continue
assert valid>=20, 'Paragens sem coordenadas válidas na região de Leiria'
network=json.loads((root/'osm-network.json').read_text(encoding='utf-8'))
routes=network.get('routes',[])
assert isinstance(routes,list), 'Relações OSM inválidas'
mobilis=[x for x in routes if x.get('mobilis')]
print(f'OSM verificado: {len(stops)} paragens ({valid} na região), {len(routes)} relações, {len(mobilis)} marcadas Mobilis')
