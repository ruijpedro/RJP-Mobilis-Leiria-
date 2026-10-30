import io,zipfile,unittest,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from validate_gtfs import inspect

def make(agency='Mobilis Leiria',bad=False):
 files={'agency.txt':f'agency_name,agency_timezone\n{agency},Europe/Lisbon\n','routes.txt':'route_id,route_short_name\n7,7\n','trips.txt':'route_id,service_id,trip_id\n7,wd,t1\n','stops.txt':'stop_id,stop_name,stop_lat,stop_lon\ns1,Vidigal,39.75,-8.8\n','stop_times.txt':f'trip_id,stop_id,stop_sequence,arrival_time,departure_time\nt1,{"bad" if bad else "s1"},1,07:00:00,07:00:00\n','calendar.txt':'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nwd,1,1,1,1,1,0,0,20260901,20261231\n'}
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as z:
  for k,v in files.items():z.writestr(k,v)
 return out.getvalue()
class TestGTFS(unittest.TestCase):
 def test_valid(self):self.assertEqual(inspect(make())['stopTimes'],1)
 def test_other_operator(self):
  with self.assertRaises(ValueError):inspect(make('Outro Operador'))
 def test_broken_references(self):
  with self.assertRaises(ValueError):inspect(make(bad=True))
if __name__=='__main__':unittest.main()
