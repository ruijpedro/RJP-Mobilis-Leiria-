import csv
import pathlib
import tempfile
import unittest
import zipfile
import sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from build_reviewed_gtfs import convert,FIELDS

class ReviewedGTFS(unittest.TestCase):
    def test_requires_review_and_exports_five_tables(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=pathlib.Path(tmp)/'in.csv'; output=pathlib.Path(tmp)/'out.zip'
            row=dict(zip(FIELDS,['7','U','trip1','stopA','A','39.743','-8.806','1','07:00:00','07:00:00','Centro','20260901','20261231','1111100','https://mobilis.pt/linhas/linha-7/','no']))
            with path.open('w',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerow(row)
            with self.assertRaisesRegex(ValueError,'não revisto'):convert(path,output)
            row['reviewed']='yes'
            with path.open('w',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerow(row)
            self.assertEqual(convert(path,output),(1,1))
            with zipfile.ZipFile(output) as z:self.assertEqual(len(z.namelist()),5)

if __name__=='__main__':unittest.main()
