#!/usr/bin/env python3
"""Prepara linhas por paragem a partir de GTFS, para revisão antes da publicação.

Uso: python scripts/import_regional_routes.py feed.zip candidatos.json --source id-fonte
Requer stops.txt, routes.txt, trips.txt e stop_times.txt; não publica horários.
"""
import argparse
import csv
import io
import json
import math
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

def read_csv(z, basename):
    matches = [name for name in z.namelist() if name.rsplit("/", 1)[-1].lower() == basename]
    if len(matches) != 1:
        raise ValueError(f"GTFS requer um único {basename}")
    if z.getinfo(matches[0]).file_size > 50_000_000:
        raise ValueError(f"{basename} demasiado grande")
    with z.open(matches[0]) as stream:
        return list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")))

def build_candidates(archive, source):
    if not source or not source.strip():
        raise ValueError("Fonte obrigatória")
    with ZipFile(archive) as z:
        stops = read_csv(z, "stops.txt")
        routes = read_csv(z, "routes.txt")
        trips = read_csv(z, "trips.txt")
        times = read_csv(z, "stop_times.txt")
    route_names = {}
    for route in routes:
        rid = (route.get("route_id") or "").strip()
        if rid:
            route_names[rid] = (route.get("route_short_name") or route.get("route_long_name") or rid).strip()
    trip_routes = {
        (trip.get("trip_id") or "").strip(): (trip.get("route_id") or "").strip()
        for trip in trips
        if trip.get("trip_id") and trip.get("route_id") in route_names
    }
    stop_routes = defaultdict(set)
    for item in times:
        sid = (item.get("stop_id") or "").strip()
        rid = trip_routes.get((item.get("trip_id") or "").strip())
        if sid and rid:
            stop_routes[sid].add(rid)
    result = []
    seen = set()
    for stop in stops:
        sid = (stop.get("stop_id") or "").strip()
        name = (stop.get("stop_name") or "").strip()
        if not sid or not name or sid in seen:
            continue
        if (stop.get("location_type") or "0").strip() not in ("", "0"):
            continue
        try:
            lat, lon = float(stop["stop_lat"]), float(stop["stop_lon"])
        except (ValueError, TypeError, KeyError):
            continue
        if not math.isfinite(lat) or not math.isfinite(lon) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        seen.add(sid)
        route_ids = sorted(stop_routes.get(sid, ()))
        result.append({
            "id": sid, "name": name, "lat": lat, "lon": lon,
            "source": source.strip(), "kind": "regional-candidate",
            "reviewStatus": "pending", "scheduleStatus": "unknown",
            "routeIds": route_ids,
            "routeNames": [route_names[rid] for rid in route_ids]
        })
    return {"schemaVersion": 2, "source": source.strip(), "stops": result}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source", required=True)
    args = parser.parse_args()
    result = build_candidates(args.feed, args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['stops'])} paragens preparadas, com linhas associadas quando presentes no GTFS; publicação pendente de revisão.")

if __name__ == "__main__":
    main()
