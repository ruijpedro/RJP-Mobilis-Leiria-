#!/usr/bin/env python3
"""Exporta relações OSM de autocarros de Leiria e a geometria por troços, sem inventar ligações entre vias descontínuas."""
import json, math, sys, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timezone
ENDPOINTS = ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']
BBOX='39.68,-8.89,39.81,-8.72'
QUERY=f'[out:json][timeout:120];rel["type"="route"]["route"="bus"]({BBOX});out geom;'
STOP_ROLES={'stop','stop_entry_only','stop_exit_only','platform','platform_entry_only','platform_exit_only'}
HINTS=('mobilis','rodoviária do lis','rodoviaria do lis','rdl')
def meters(a,b):
    lat=(a[0]+b[0])/2
    return math.hypot((a[0]-b[0])*111195, (a[1]-b[1])*111195*math.cos(math.radians(lat)))
def chain_segments(ways, tolerance_m=15):
    """Agrupa apenas troços espacialmente contíguos; preserva descontinuidades."""
    chains=[]
    for pts in ways:
        if len(pts)<2: continue
        pts=list(pts)
        if not chains:
            chains.append(pts); continue
        last=chains[-1][-1]
        if meters(last,pts[-1]) < meters(last,pts[0]): pts.reverse()
        if meters(last,pts[0])<=tolerance_m:
            chains[-1].extend(pts[1:] if meters(last,pts[0])<0.5 else pts)
        else: chains.append(pts)
    return chains
def parse_network(payload,known_stops=None):
    known={s['stop_id']:s for s in (known_stops or [])}
    routes=[]
    for rel in payload.get('elements',[]):
        if rel.get('type')!='relation':continue
        tags=rel.get('tags') or {}
        if tags.get('route')!='bus':continue
        stops=[]; ways=[]
        for m in rel.get('members',[]):
            role=m.get('role',''); sid=f"osm:{m.get('type')}:{m.get('ref')}"
            if role in STOP_ROLES:
                lat=m.get('lat',(m.get('center') or {}).get('lat'))
                lon=m.get('lon',(m.get('center') or {}).get('lon'))
                if (lat is None or lon is None) and sid in known:
                    lat=float(known[sid]['stop_lat']); lon=float(known[sid]['stop_lon'])
                if lat is None or lon is None:continue
                if stops and meters((stops[-1]['lat'],stops[-1]['lon']),(lat,lon))<8:continue
                stops.append({'stop_id':sid,'name':(known.get(sid) or {}).get('stop_name') or m.get('name') or '', 'lat':lat,'lon':lon})
            elif m.get('type')=='way' and role in ('','forward','backward') and m.get('geometry'):
                coords=[(v['lat'],v['lon']) for v in m['geometry']]
                if role=='backward':coords.reverse()
                ways.append(coords)
        txt=' '.join(str(tags.get(k,'')) for k in ('network','operator','name')).lower()
        shape_segments=[[[round(lat,6),round(lon,6)] for lat,lon in seg] for seg in chain_segments(ways)]
        routes.append({'osm_id':rel['id'],'ref':tags.get('ref',''),'name':tags.get('name',''),'from':tags.get('from',''),'to':tags.get('to',''),'network':tags.get('network',''),'operator':tags.get('operator',''),'mobilis':any(x in txt for x in HINTS),'stops':stops,'shape_segments':shape_segments})
    return sorted(routes,key=lambda r:(r['ref'].zfill(4),r['osm_id']))
def fetch():
    last=None
    for endpoint in ENDPOINTS:
        try:
            req=urllib.request.Request(endpoint,data=urllib.parse.urlencode({'data':QUERY}).encode(),headers={'User-Agent':'RJP-Mobilis-Leiria/1.6 (OSM export)'})
            with urllib.request.urlopen(req,timeout=150) as response:return json.load(response)
        except Exception as exc:last=exc
    raise SystemExit(f'Falha Overpass: {last}')
def main():
    s=Path('public/data/osm-stops-leiria.json')
    known=json.loads(s.read_text(encoding='utf-8')) if s.exists() else []
    routes=parse_network(fetch(),known)
    if not routes:raise SystemExit('Sem relações OSM; ficheiro anterior preservado.')
    out={'generatedAt':datetime.now(timezone.utc).isoformat(),'source':'OpenStreetMap contributors (ODbL)','note':'Rotas cartográficas; sem horários e com geometria por segmentos.','routes':routes}
    d=Path('public/data');d.mkdir(parents=True,exist_ok=True)
    (d/'osm-network.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
    print(f'{len(routes)} relações, {sum(r["mobilis"] for r in routes)} marcadas Mobilis')
if __name__=='__main__':sys.exit(main())
