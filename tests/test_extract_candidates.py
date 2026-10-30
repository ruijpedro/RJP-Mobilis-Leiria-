import json, pathlib, unittest
class TestQueue(unittest.TestCase):
 def test_never_approved(self):
  q=json.loads(pathlib.Path('public/data/mobilis-review-queue.json').read_text()); self.assertFalse(q['approvedForRouting'])
 def test_script_blocks_untrusted_hosts(self):
  t=pathlib.Path('scripts/extract_schedule_candidates.py').read_text(); self.assertIn("('mobilis.pt','www.mobilis.pt')",t)
if __name__=='__main__':unittest.main()
