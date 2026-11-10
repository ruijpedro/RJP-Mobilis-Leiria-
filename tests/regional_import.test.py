import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
def load(name, filename):
    spec = spec_from_file_location(name, ROOT / "scripts" / filename)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

geo = load("regional_geojson", "import_regional_stops.py")
gtfs = load("regional_gtfs", "import_regional_gtfs.py")

class RegionalImportTests(unittest.TestCase):
    def test_geojson_candidates_keep_provenance(self):
        doc = {"type":"FeatureCollection","features":[
            {"type":"Feature","properties":{"id":"A","name":"Paragem A","source":"operador"},
             "geometry":{"type":"Point","coordinates":[-8.8,39.7]}},
            {"type":"Feature","properties":{"id":"A","name":"Paragem A","source":"operador"},
             "geometry":{"type":"Point","coordinates":[-8.8,39.7]}},
            {"type":"Feature","properties":{"id":"B","name":"Sem fonte"},
             "geometry":{"type":"Point","coordinates":[-8.8,39.7]}}
        ]}
        rows = geo.candidates(doc)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["reviewStatus"],"pending")
        self.assertEqual(rows[0]["scheduleStatus"],"unknown")

    def test_gtfs_candidates_do_not_create_timetables(self):
        with tempfile.TemporaryDirectory() as d:
            archive = Path(d)/"feed.zip"
            with zipfile.ZipFile(archive,"w") as z:
                z.writestr("stops.txt","stop_id,stop_name,stop_lat,stop_lon,location_type\n1,Paragem A,39.7,-8.8,0\n2,Sem posição,,,0\n3,Estação,39.7,-8.8,1\n")
            rows=gtfs.extract_stops(archive,"feed-exemplo")
            self.assertEqual(len(rows),1)
            self.assertEqual(rows[0]["source"],"feed-exemplo")
            self.assertEqual(rows[0]["scheduleStatus"],"unknown")

if __name__ == "__main__":
    unittest.main()
