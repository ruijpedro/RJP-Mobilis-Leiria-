#!/usr/bin/env python3
"""Validar um CSV de horários revistos linha a linha: line,stop,trip_id,sequence,time,service,source_url.
Não faz scraping de terceiros nem publica horários sem proveniência.
"""
import csv,sys,re
from collections import defaultdict
path=sys.argv[1] if len(sys.argv)>1 else "data/reviewed-stop-schedule.csv"
with open(path,encoding="utf-8-sig",newline="") as f: rows=list(csv.DictReader(f))
expected={'line','stop','trip_id','sequence','time','service','source_url'}
if not rows:sys.exit('Ficheiro sem horários.')
if not expected.issubset(rows[0]):sys.exit('Colunas obrigatórias em falta: '+str(expected-set(rows[0])))
seen=set(); trips=defaultdict(list)
for i,r in enumerate(rows,2):
 if r['line'] not in map(str,range(1,11)):sys.exit(f'Linha inválida na linha {i}')
 if not re.fullmatch(r'\d{2}:\d{2}(?::\d{2})?',r['time']):sys.exit(f'Hora inválida {i}')
 if not r['source_url'].startswith('https://'):sys.exit(f'Falta URL da fonte {i}')
 if not r['stop'].strip() or not r['trip_id'].strip():sys.exit(f'Paragem/viagem vazia {i}')
 key=(r['trip_id'],r['sequence']);
 if key in seen:sys.exit(f'Sequência repetida {i}')
 seen.add(key);trips[r['trip_id']].append((int(r['sequence']),r['time']))
for tid,pairs in trips.items():
 pairs.sort(); times=[int(v[:2])*60+int(v[3:5]) for _,v in pairs]
 if times!=sorted(times):sys.exit('Horários fora de ordem: '+tid)
print(f'OK: {len(rows)} passagens em {len(trips)} viagens revistas')
