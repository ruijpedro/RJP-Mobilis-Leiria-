"""Download official timetable media and extract review-only evidence."""
import hashlib, json, re, subprocess, tempfile, urllib.request
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "timetable-review"
OUT.mkdir(exist_ok=True)
catalog = json.loads((ROOT / "public/data/mobilis-sources.json").read_text())
report = []
def allowed(url):
    u = urlparse(url)
    return u.scheme == "https" and u.hostname in ("mobilis.pt", "www.mobilis.pt")
class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl):
            raise ValueError("External redirect")
        return super().redirect_request(req, fp, code, msg, headers, newurl)
opener = urllib.request.build_opener(OfficialRedirect())
for line in catalog["lines"]:
    for i, url in enumerate(line["images"] + line["pdfs"]):
        entry = {"line": line["id"], "source": url, "status": "review-required"}
        report.append(entry)
        try:
            if not allowed(url):
                raise ValueError("External source")
            with opener.open(urllib.request.Request(url, headers={"User-Agent":"RJP-Mobilis-Timetable-Audit/1.0"}), timeout=30) as response:
                raw = response.read(15000001)
            if len(raw) > 15000000:
                raise ValueError("Document too large")
            entry["sha256"] = hashlib.sha256(raw).hexdigest()
            ext = Path(urlparse(url).path).suffix.lower()
            name = "line-" + str(line["id"]) + "-" + str(i)
            if ext == ".pdf":
                with tempfile.TemporaryDirectory() as d:
                    p = Path(d)/"source.pdf"
                    p.write_bytes(raw)
                    extracted = subprocess.check_output(["pdftotext","-layout",str(p),"-"], timeout=40).decode("utf-8","replace")
            elif ext == ".svg":
                root = ET.fromstring(raw)
                extracted = "\n".join(" ".join(t.itertext()) for t in root.iter() if t.tag.split("}")[-1] == "text")
            else:
                extracted = ""
            if not extracted.strip() or not re.search(r"\d{1,2}[:h][0-5]\d", extracted):
                with tempfile.TemporaryDirectory() as d:
                    p = Path(d)/("source"+ext)
                    p.write_bytes(raw)
                    prefix = Path(d)/"page"
                    if ext == ".pdf":
                        subprocess.run(["pdftoppm","-f","1","-l","8","-scale-to","3500","-png",str(p),str(prefix)],check=True,timeout=90)
                    elif ext == ".svg":
                        subprocess.run(["rsvg-convert","-w","3500","-o",str(prefix)+".png",str(p)],check=True,timeout=60)
                    else:
                        prefix = p
                    images = sorted(Path(d).glob("page*.png")) if ext in (".pdf",".svg") else [p]
                    chunks = []
                    for image in images:
                        chunks.append(subprocess.check_output(["tesseract",str(image),"stdout","-l","por+eng","--psm","6","tsv"],timeout=90).decode("utf-8","replace"))
                    extracted = "\n".join(chunks)
                    entry["method"] = "ocr-tsv-review-only"
            entry["time_tokens"] = len(re.findall(r"(?<!\d)(?:[01]?\d|2[0-9])[:h][0-5]\d(?!\d)", extracted))
            entry["text_file"] = name + ".txt"
            (OUT / entry["text_file"]).write_text(extracted, encoding="utf-8")
            entry["status"] = "review-required" if extracted.strip() else "no-text-layer"
        except Exception as exc:
            entry["status"] = "error"
            entry["error"] = str(exc)
(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print("Documents:", len(report), "with time tokens:", sum(e.get("time_tokens",0)>0 for e in report))
