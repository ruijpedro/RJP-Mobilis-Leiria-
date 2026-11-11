#!/usr/bin/env python3
"""Extrai paragens e carreiras intermunicipais de um export Overpass JSON.

Uso: python scripts/import_osm_regional_routes.py overpass.json candidatos.json
As associações OSM são indicativas e exigem revisão antes de publicação.
"""
import json
import sys
from pathlib import Path

def extract(document):
    elements = document.get('elements', [])
    objects = {(e.get('type'), e.get('id')): e for e in elements}
    result = {}
    for route in elements:
        tags = route.get('tags') or {}
        if route.get('type') != 'relation' or tags.get('route') != 'bus':
            continue
        operator = tags.get('operator') or tags.get('network') or ''
        descriptor = ' '.join((operator, tags.get('name', ''), tags.get('ref', ''))).casefold()
        if 'mobilis' in descriptor:
            continue
        line = tags.get('ref') or tags.get('name') or ''
        if not line:
            continue
        for member in route.get('members', []):
            role = member.get('role', '')
            if not (role.startswith('platform') or role.startswith('stop')):
                continue
            obj = objects.get((member.get('type'), member.get('ref')), {})
            t = obj.get('tags') or {}
            name = t.get('name') or t.get('official_name')
            lat = obj.get('lat', (obj.get('center') or {}).get('lat'))
            lon = obj.get('lon', (obj.get('center') or {}).get('lon'))
            if not name or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
                continue
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            sid = f"osm:{member['type']}:{member['ref']}"
            row = result.setdefault(sid, dict(id=sid, name=name, lat=lat, lon=lon,
                source='OpenStreetMap', operator=operator, routeNames=[],
                reviewStatus='pending', scheduleStatus='unknown',
                kind='regional-candidate', osmRouteRelations=[]))
            if line not in row['routeNames']:
                row['routeNames'].append(line)
            if route['id'] not in row['osmRouteRelations']:
                row['osmRouteRelations'].append(route['id'])
    return {'schemaVersion': 1, 'stops': sorted(result.values(), key=lambda r: (r['name'], r['id']))}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Uso: import_osm_regional_routes.py overpass.json candidatos.json')
    result = extract(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')))
    Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f"{len(result['stops'])} paragens candidatas; requerem validação antes de aparecerem no mapa.")
