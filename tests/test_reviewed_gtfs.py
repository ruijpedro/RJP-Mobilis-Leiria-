import importlib.util, pathlib, tempfile, unittest, zipfile
path=pathlib.Path(__file__).resolve().parents[1]/'scripts'/'build_reviewed_gtfs.py'
spec=importlib.util.spec_from_file_location('converter',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def sample():
 return {'operator':'Mobilis Leiria','stops':[{'id':'a','name':'A','lat':39.75,'lon':-8.81},{'id':'b','name':'B','lat':39.76,'lon':-8.80}], 'trips':[{'id':'x','line':'7','service_date':'20261102','headsign':'B','approved':True,'source_url':'https://mobilis.pt/linhas/linha-7/','source_sha256':'a'*64,'stops':[{'stop_id':'a','arrival':'23:55','departure':'23:55'},{'stop_id':'b','arrival':'24:10','departure':'24:10'}]}]}
class TestBuild(unittest.TestCase):
 def test_valid_and_midnight(self):
  x=sample();self.assertEqual(len(m.build(x)['stop_times']),2)
  with tempfile.TemporaryDirectory() as d:
   out=pathlib.Path(d)/'out.zip';m.write_gtfs(x,out)
   with zipfile.ZipFile(out) as z:self.assertIn('24:10',z.read('stop_times.txt').decode())
 def test_unreviewed_rejected(self):
  x=sample();x['trips'][0]['approved']=False
  with self.assertRaises(ValueError):m.build(x)
 def test_unofficial_rejected(self):
  x=sample();x['trips'][0]['source_url']='https://other.example/foo'
  with self.assertRaises(ValueError):m.build(x)
 def test_bad_order_rejected(self):
  x=sample();x['trips'][0]['stops'][1]['arrival']='22:10'
  with self.assertRaises(ValueError):m.build(x)
 def test_bad_stop_rejected(self):
  x=sample();x['trips'][0]['stops'][1]['stop_id']='missing'
  with self.assertRaises(ValueError):m.build(x)
if __name__=='__main__':unittest.main()
