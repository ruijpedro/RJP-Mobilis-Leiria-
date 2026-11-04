import importlib.util
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "update_sources.py"
spec = importlib.util.spec_from_file_location("mobilis_sources", PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class TestSources(unittest.TestCase):
    def test_catalogo_de_nove_linhas_sem_formato_antigo(self):
        old = {"lines": [{"id": "1", "images": ["https://mobilis.pt/antigo.svg"], "pdfs": []}]}
        def fetch(url):
            if url.endswith("linha-1/"):
                return '<img src="https://mobilis.pt/wp-content/uploads/HORARIOS-Linha-1.svg">'
            raise OSError("rede indisponível")
        result, checked = module.update_catalog(old, fetch)
        self.assertEqual(checked, 1)
        self.assertEqual(len(result["lines"]), 9)
        self.assertEqual(result["lines"][0]["status"], "checked")
        self.assertEqual(result["lines"][1]["status"], "unavailable")
    def test_erro_preserva_links_existentes(self):
        old = {"lines": [{"id": "6", "images": ["https://mobilis.pt/horarios-linha6.svg"], "pdfs": ["https://mobilis.pt/linha6.pdf"]}]}
        result, checked = module.update_catalog(old, lambda url: (_ for _ in ()).throw(OSError("offline")))
        self.assertEqual(checked, 0)
        self.assertEqual(result["lines"][5]["pdfs"], old["lines"][0]["pdfs"])
        self.assertEqual(result["lines"][5]["status"], "cached-after-error")
    def test_rejeita_ligacoes_externas(self):
        links = module.classify_links('<a href="https://example.com/HORARIOS-Linha-1.pdf">x</a><a href="/ficheiros/HORARIOS-Linha-1.pdf">oficial</a>', "https://mobilis.pt/linhas/linha-1/")
        self.assertEqual(links["pdfs"], ["https://mobilis.pt/ficheiros/HORARIOS-Linha-1.pdf"])

if __name__ == "__main__":
    unittest.main()
