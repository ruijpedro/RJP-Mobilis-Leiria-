#!/usr/bin/env python3
"""Exporta as paragens OSM de Leiria no mesmo formato que src/osmStops.js usa.

Uso (a partir da raiz do projeto, com Internet):
    python scripts/export_osm_stops.py
Gera:
    public/data/osm-stops-leiria.json     (formato da app: stop_id, stop_name, stop_lat, stop_lon...)
    public/data/osm-stops-leiria.geojson  (GeoJSON, para QGIS/mapas)
Dados © OpenStreetMap contributors (ODbL).
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
# Mesma caixa que src/osmStops.js (sul, oeste, norte, este)
BBOX = "39.68,-8.89,39.81,-8.72"
QUERY = (
    "[out:json][timeout:60];("
    f'node["highway"="bus_stop"]({BBOX});'
    f'node["public_transport"="platform"]({BBOX});'
    f'way["public_transport"="platform"]({BBOX});'
    ");out center;"
)


def parse_stops(payload):
    seen = {}
    for e in payload.get("elements", []):
        lat = e.get("lat", (e.get("center") or {}).get("lat"))
        lon = e.get("lon", (e.get("center") or {}).get("lon"))
        if lat is None or lon is None:
            continue
        tags = e.get("tags") or {}
        if (
            tags.get("highway") != "bus_stop"
            and tags.get("public_transport") != "platform"
            and tags.get("amenity") != "bus_station"
        ):
            continue
        key = f"osm:{e.get('type')}:{e.get('id')}"
        seen[key] = {
            "stop_id": key,
            "stop_name": tags.get("name") or tags.get("local_ref") or tags.get("ref") or "Paragem sem nome",
            "stop_lat": str(lat),
            "stop_lon": str(lon),
            "osm": True,
            "ref": tags.get("ref", ""),
            "operator": tags.get("operator", ""),
        }
    return list(seen.values())


def to_geojson(stops):
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(s["stop_lon"]), float(s["stop_lat"])]},
                "properties": {k: v for k, v in s.items() if k not in ("stop_lat", "stop_lon")},
            }
            for s in stops
        ],
    }


def fetch():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    last = None
    for url in ENDPOINTS:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=90) as r:
                return json.load(r)
        except Exception as exc:  # tenta o servidor seguinte
            last = exc
    raise SystemExit(f"Falha ao consultar o Overpass: {last}")


def main():
    stops = parse_stops(fetch())
    if not stops:
        raise SystemExit("Sem paragens devolvidas; nada foi escrito.")
    out = Path("public/data")
    out.mkdir(parents=True, exist_ok=True)
    (out / "osm-stops-leiria.json").write_text(json.dumps(stops, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "osm-stops-leiria.geojson").write_text(json.dumps(to_geojson(stops), ensure_ascii=False), encoding="utf-8")
    print(f"{len(stops)} paragens exportadas para {out}/")


if __name__ == "__main__":
    sys.exit(main())
