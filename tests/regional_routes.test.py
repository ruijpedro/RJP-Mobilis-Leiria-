import tempfile
import unittest
import zipfile
from pathlib import Path
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("regional_routes", ROOT / "scripts" / "import_regional_routes.py")
module = module_from_spec(spec)
spec.loader.exec_module(module)

class RegionalRoutesTests(unittest.TestCase):
    def test_routes_associated_without_schedules(self):
        with tempfile.TemporaryDirectory() as folder:
            feed = Path(folder) / "regional.zip"
            with zipfile.ZipFile(feed, "w") as z:
                z.writestr("stops.txt", "stop_id,stop_name,stop_lat,stop_lon\nS1,Leiria,39.74,-8.80\nS2,Outra,39.75,-8.81\n")
                z.writestr("routes.txt", "route_id,route_short_name,route_long_name\nR1,101,Leiria - Destino\n")
                z.writestr("trips.txt", "route_id,service_id,trip_id\nR1,WD,T1\n")
                z.writestr("stop_times.txt", "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,08:00:00,08:00:00,S1,1\n")
            data = module.build_candidates(feed, "operador-exemplo")
            self.assertEqual(data["schemaVersion"], 2)
            self.assertEqual(len(data["stops"]), 2)
            self.assertEqual(data["stops"][0]["routeNames"], ["101"])
            self.assertEqual(data["stops"][1]["routeNames"], [])
            self.assertEqual(data["stops"][0]["scheduleStatus"], "unknown")
            self.assertNotIn("departure_time", data["stops"][0])

    def test_source_required(self):
        with self.assertRaises(ValueError):
            module.build_candidates("ficheiro-inexistente.zip", "")

if __name__ == "__main__":
    unittest.main()
