import unittest
from scripts.import_osm_regional_routes import extract

class RegionalRoutesTest(unittest.TestCase):
    def test_extracts_and_merges_non_mobilis_stops(self):
        doc={'elements':[
            {'type':'node','id':10,'lat':39.74,'lon':-8.81,'tags':{'name':'Paragem A'}},
            {'type':'relation','id':100,'tags':{'route':'bus','operator':'Rodoviária do Lis','ref':'5943'},'members':[{'type':'node','ref':10,'role':'platform'}]},
            {'type':'relation','id':101,'tags':{'route':'bus','operator':'Rodoviária do Lis','ref':'123'},'members':[{'type':'node','ref':10,'role':'stop'}]},
            {'type':'relation','id':102,'tags':{'route':'bus','operator':'Mobilis','ref':'7'},'members':[{'type':'node','ref':10,'role':'platform'}]}
        ]}
        rows=extract(doc)['stops']
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['routeNames'],['5943','123'])
        self.assertEqual(rows[0]['reviewStatus'],'pending')

if __name__=='__main__': unittest.main()
