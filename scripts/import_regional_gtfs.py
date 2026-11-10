#!/usr/bin/env python3
"""Extrai candidatos a paragens de um feed GTFS ZIP, sem inventar horários.

Uso: python scripts/import_regional_gtfs.py feed.zip candidatos.json --source operador
Não publica automaticamente dados na WebApp.
"""
import argparse
import csv
import io
import json
import math
from pathlib import Path
from zipfile import ZipFile, BadZipFile

def extract_stops(archive, source):
    if not source or not source.strip():
        raise ValueError("A identificação da fonte é obrigatória")
    with ZipFile(archive) as z:
        names = [n for n in z.namelist() if n.rsplit("/", 1)[-1].lower() == "stops.txt"]
        if len(names) != 1:
            raise ValueError("GTFS requer um único stops.txt")
        if z.getinfo(names[0]).file_size > 20_000_000:
            raise ValueError("stops.txt demasiado grande")
        with z.open(names[0]) as f:
            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig", newline=""))
            if not {"stop_id", "stop_name", "stop_lat", "stop_lon"}.issubset(reader.fieldnames or []):
                raise ValueError("Campos obrigatórios GTFS em falta")
            seen = set()
            result = []
            for row in reader:
                sid = (row.get("stop_id") or "").strip()
                name = (row.get("stop_name") or "").strip()
                if not sid or not name or sid in seen:
                    continue
                if (row.get("location_type") or "0").strip() not in ("", "0"):
                    continue
                try:
                    lat = float(row["stop_lat"])
                    lon = float(row["stop_lon"])
                except (TypeError, ValueError):
                    continue
                if not math.isfinite(lat) or not math.isfinite(lon) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
                seen.add(sid)
                result.append({"id": sid, "name": name, "lat": lat, "lon": lon,
                               "source": source.strip(), "operator": "",
                               "reviewStatus": "pending", "scheduleStatus": "unknown",
                               "kind": "regional-candidate"})
            return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source", required=True)
    args = parser.parse_args()
    rows = extract_stops(args.feed, args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"schemaVersion": 1, "stops": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(rows)} candidatos GTFS preparados; sem importação automática de horários.")

if __name__ == "__main__":
    main()
