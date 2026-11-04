import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
import {stopTimetableSummary} from '../src/stopTimetable.js';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const payload=load('official-verified-schedules.json');
const selected=payload.services.filter(s=>['2','9'].includes(s.line));
const data=officialSchedulesToGTFS({schemaVersion:1,services:selected});
const routes=load('published-stop-sequences.json');
const result=interpolatePublishedStops(data,routes);
test('36 viagens linha 2 e 12 viagens linha 9 passam a ter horários intermédios calculados',()=>{
 assert.equal(selected.filter(s=>s.line==='2').length,36);
 assert.equal(selected.filter(s=>s.line==='9').length,12);
 assert.equal(result.estimatedStopTimes,36*39+12*18);
});
test('todas as horas oficiais de 2 e 9 mantêm o valor e a ordem, mesmo com terminal repetido',()=>{
 for(const trip of data.trips){
  const before=data.stopTimes.filter(x=>x.trip_id===trip.trip_id);
  const after=result.stopTimes.filter(x=>x.trip_id===trip.trip_id);
  assert.equal(after.length,trip.route_id.endsWith('-2')?46:22);
  assert.deepEqual(before.map(x=>x.departure_time),
   after.filter(x=>!x.timeIsEstimated).map(x=>x.departure_time));
  const minutes=after.map(x=>Number(x.departure_time.slice(0,2))*60+Number(x.departure_time.slice(3,5)));
  assert.ok(minutes.every((x,i)=>i===0||x>=minutes[i-1]));
 }
});
test('horas aproximadas distinguem-se das oficialmente transcritas',()=>{
 const estimated=result.stopTimes.find(x=>x.timeIsEstimated);
 assert.ok(estimated);
 assert.equal(estimated.estimateMethod,'linear-stop-order');
 const report=stopTimetableSummary(result,estimated.stop_id,new Date(2026,10,4,7,0));
 assert.ok(report.groups.flatMap(x=>x.departures).some(x=>x.estimated));
});
test('interpolação é idempotente e não cria viagens novas',()=>{
 assert.equal(interpolatePublishedStops(result,routes),result);
 assert.equal(result.trips.length,data.trips.length);
});
