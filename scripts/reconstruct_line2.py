import csv, json, re
from pathlib import Path
from collections import defaultdict
root=Path(__file__).resolve().parents[1]/"timetable-review"
report=json.loads((root/"report.json").read_text())
source=next(e for e in report if e["line"]=="2" and e["source"].endswith(".svg"))
rows=defaultdict(list)
for w in csv.DictReader((root/source["text_file"]).read_text().splitlines(),delimiter="\t"):
    if w["level"]=="5":
        rows[int(w["line_num"])].append(w)
names=["Av. Bernardo Pimenta (Terminal)","Hospital Sto André (visitas)","Av. Marquês de Pombal","Campus 2 ULO","Av. Bernardo Pimenta (Terminal)","Esc. Afonso Lopes Vieira","Av. Bernardo Pimenta (Terminal)"]
hints=["bernardo","hospital","pombal","campus","bernardo","vieira","bernardo"]
trips=[]
rejected=[]
for start,count,days in [(3,13,"weekdays"),(11,14,"weekdays"),(19,9,"saturday")]:
    table=[]
    for i in range(7):
        words=rows[start+i]
        label=" ".join(w["text"] for w in words if int(w["left"])<1000).lower()
        cells=sorted([w for w in words if re.fullmatch(r"(?:[01][0-9]|2[0-9]):[0-5][0-9]",w["text"])],key=lambda w:int(w["left"]))
        if hints[i] not in label or len(cells)!=count:
            raise ValueError("Unexpected line 2 table layout; manual review required")
        table.append(cells)
    for col in range(count):
        cells=[row[col] for row in table]
        times=[w["text"] for w in cells]
        minutes=[int(t[:2])*60+int(t[3:]) for t in times]
        if any(b<=a for a,b in zip(minutes,minutes[1:])) or min(float(w["conf"]) for w in cells)<60 or max(int(w["left"]) for w in cells)-min(int(w["left"]) for w in cells)>35:
            rejected.append({"days":days,"times":times})
            continue
        trips.append({"days":days,"stops":[{"name":n,"time":t,"confidence":float(w["conf"])} for n,t,w in zip(names,times,cells)]})
(root/"line2-candidates.json").write_text(json.dumps({"status":"review-only","source":source["source"],"sha256":source.get("sha256"),"trips":trips,"rejected":rejected},ensure_ascii=False,indent=2))
print("Line 2 candidates:",len(trips),"rejected:",len(rejected))
