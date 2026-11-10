#!/usr/bin/env python3
"""Valida paragens intermunicipais GeoJSON para revisão, sem alterar a rede Mobilis.

Uso: python scripts/import_regional_stops.py entrada.geojson saida.json
Só aceita FeatureCollection com Point WGS84 e identificador e nome explícitos.
A saída é uma lista de candidatos, NÃO uma importação automática para a app.
"""
import json
import sys
from pathlib import Path

def candidates(document):
    if document.get("type") != "FeatureCollection" or not isinstance(document.get("features"), list):
        raise ValueError("É necessária uma FeatureCollection GeoJSON")
    result = []
    seen = set()
    for feature in document["features"]:
        if not isinstance(feature, dict):
            continue
        geometry = feature.get("geometry") or {}
        props = feature.get("properties") or {}
        if geometry.get("type") != "Point":
            continue
        coords = geometry.get("coordinates") or []
        if len(coords) < 2:
            continue
        lon, lat = coords[:2]
        if any(type(v) not in (int, float) for v in (lon, lat)):
            continue
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            continue
        name = str(props.get("stop_name") or props.get("name") or "").strip()
        sid = str(props.get("stop_id") or props.get("id") or feature.get("id") or "").strip()
        if not name or not sid:
            continue
        source = str(props.get("source") or "").strip()
        if not source:
            continue
        key = (source, sid)
        if key in seen:
            continue
        seen.add(key)
        result.append({
            "id": sid, "name": name, "lat": lat, "lon": lon,
            "source": source, "operator": str(props.get("operator") or ""),
            "reviewStatus": "pending", "scheduleStatus": "unknown",
            "kind": "regional-candidate"
        })
    return result

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: import_regional_stops.py entrada.geojson saida.json")
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    rows = candidates(data)
    Path(sys.argv[2]).write_text(json.dumps({"schemaVersion": 1, "stops": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(rows)} paragens candidatas para revisão; nenhuma foi publicada na app.")
