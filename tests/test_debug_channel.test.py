import unittest
import importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("debug",root/"scripts/configure_debug_channel.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class DebugPackageTests(unittest.TestCase):
 def test_separar_debug_sem_alterar_release(self):
  src='android { buildTypes { release { minifyEnabled false } } }'
  out=m.configure(src)
  self.assertIn('applicationIdSuffix ".dev"',out)
  self.assertIn('versionNameSuffix "-dev"',out)
  self.assertIn('release { minifyEnabled false }',out)
 def test_idempotente(self):
  src='buildTypes { release { } }'
  self.assertEqual(m.configure(m.configure(src)),m.configure(src))
 def test_fail_closed(self):
  with self.assertRaises(ValueError):
   m.configure('android {}')

if __name__=="__main__": unittest.main()
