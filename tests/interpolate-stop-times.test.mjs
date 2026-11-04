import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
import {stopTimetableSummary} from '../src/stopTimetable.js';
import {plan} from '../src/gtfs.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const raw=read('official-verified-schedules.json');
const published=read('published-stop-sequences.json');
const data=officialSchedulesToGTFS({schemaVersion:1,services:raw.services.filter(s=>s.line==='4')});
const enriched=interpolatePublishedStops(data,published);
test('a linha 4 ganha horas aproximadas estritamente entre referências oficiais',()=>{
 assert.ok(enriched.estimatedStopTimes>0);
 const first=data.trips[0].trip_id;
 const original=data.stopTimes.filter(s=>s.trip_id===first);
 const estimated=enriched.stopTimes.filter(s=>s.trip_id===first&&s.timeIsEstimated);
 assert.ok(estimated.length>2);
 assert.ok(estimated.every(s=>s.estimateMethod==='linear-stop-order'));
 for(const item of original){
  const same=enriched.stopTimes.find(s=>s.trip_id===item.trip_id&&s.stop_id===item.stop_id&&s.departure_time===item.departure_time);
  assert.equal(same.departure_time,item.departure_time);
  assert.notEqual(same.timeIsEstimated,true);
 }
});
test('iteração não repete estimativas nem extrapola a circulação',()=>{
 const again=interpolatePublishedStops(enriched,published);
 assert.equal(again.stopTimes.length,enriched.stopTimes.length);
 const first=data.trips[0].trip_id;
 const all=enriched.stopTimes.filter(s=>s.trip_id===first);
 assert.equal(all[0].stop_id,data.stopTimes[0].stop_id);
 assert.equal(all.at(-1).stop_id,data.stopTimes.filter(s=>s.trip_id===first).at(-1).stop_id);
});
test('horas estimadas aparecem devidamente identificadas no ecrã e no planeador',()=>{
 const example=enriched.stopTimes.find(s=>s.timeIsEstimated);
 assert.ok(example);
 const t=stopTimetableSummary(enriched,example.stop_id,new Date(2026,10,4,6,50));
 assert.ok(t.groups.flatMap(g=>g.departures).some(d=>d.estimated));
 const origin=enriched.stopTimes.find(s=>s.trip_id===example.trip_id&&Number(s.stop_sequence)<Number(example.stop_sequence));
 const routes=plan(enriched,origin.stop_id,example.stop_id,new Date(2026,10,4,6,55));
 assert.ok(routes.some(r=>r.legs.some(l=>l.estimated)));
});
test('não estima linhas com sequências incompletas nem GTFS importados',()=>{
 const other=officialSchedulesToGTFS({schemaVersion:1,services:raw.services.filter(s=>s.line==='7')});
 assert.equal(interpolatePublishedStops(other,published).estimatedStopTimes,0);
});
