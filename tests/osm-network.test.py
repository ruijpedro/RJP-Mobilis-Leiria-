import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from osm_network import chain_segments,parse_network
class NetworkTest(unittest.TestCase):
 def test_preserves_gaps(self):
  segments=chain_segments([[(39.7,-8.8),(39.71,-8.8)],[(39.75,-8.8),(39.76,-8.8)]])
  self.assertEqual(len(segments),2)
 def test_reverse(self):
  segs=chain_segments([[(39.7,-8.8),(39.71,-8.8)],[(39.72,-8.8),(39.71,-8.8)]])
  self.assertEqual(len(segs),1)
 def test_relation(self):
  payload={'elements':[{'type':'relation','id':123,'tags':{'route':'bus','ref':'7','operator':'Mobilis'},'members':[{'type':'node','ref':1,'role':'stop','lat':39.7,'lon':-8.8},{'type':'way','ref':2,'role':'','geometry':[{'lat':39.7,'lon':-8.8},{'lat':39.71,'lon':-8.8}]}]}]}
  routes=parse_network(payload)
  self.assertEqual(routes[0]['ref'],'7')
  self.assertTrue(routes[0]['mobilis'])
if __name__=='__main__':unittest.main()
