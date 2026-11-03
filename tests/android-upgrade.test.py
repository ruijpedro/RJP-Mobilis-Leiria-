import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location("upgrade",Path(__file__).resolve().parents[1]/"scripts/check_android_upgrade.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class AndroidUpgradeTests(unittest.TestCase):
    def setUp(self):
        self.old={"package":"pt.rjp.mobilisleiria","sha256":"abcd","versionCode":1101400,"versionName":"1.10.14"}
        self.new={**self.old,"versionCode":1101500,"versionName":"1.10.15"}
    def test_compatible(self):
        self.assertTrue(module.compare(self.old,self.new))
    def test_different_certificate(self):
        with self.assertRaisesRegex(ValueError,"certificado"):
            module.compare(self.old,{**self.new,"sha256":"other"})
    def test_different_package(self):
        with self.assertRaisesRegex(ValueError,"identificador"):
            module.compare(self.old,{**self.new,"package":"pt.rjp.mobilis.test"})
    def test_downgrade(self):
        with self.assertRaisesRegex(ValueError,"versionCode"):
            module.compare(self.old,{**self.new,"versionCode":1101300})

if __name__=="__main__":
    unittest.main()
