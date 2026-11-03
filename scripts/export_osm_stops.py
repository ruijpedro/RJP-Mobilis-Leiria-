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
import urllib.error
import time
from pathlib import Path

ENDPOINTS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
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
    last = None
    for attempt in range(2):
        for url in ENDPOINTS:
            for method in ("POST", "GET"):
                try:
                    body = urllib.parse.urlencode({"data": QUERY})
                    endpoint = url if method == "POST" else url + "?" + body
                    request = urllib.request.Request(
                        endpoint,
                        data=body.encode() if method == "POST" else None,
                        headers={"User-Agent": "RJP-Mobilis-Leiria/1.10 OSM-export",
                                 "Accept": "application/json",
                                 "Content-Type": "application/x-www-form-urlencoded"},
                    )
                    with urllib.request.urlopen(request, timeout=40) as r:
                        payload = json.load(r)
                        if not isinstance(payload.get("elements"), list):
                            raise ValueError("Resposta Overpass sem elementos")
                        print(f"Overpass OK: {url} ({method}), {len(payload['elements'])} elementos", flush=True)
                        return payload
                except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
                    last = exc
                    print(f"Overpass {url} ({method}), tentativa {attempt+1}: {exc}", file=sys.stderr, flush=True)
        if attempt == 0:
            time.sleep(8)
    raise SystemExit(f"Todos os servidores Overpass falharam; sem novos dados. Último erro: {last}")

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
