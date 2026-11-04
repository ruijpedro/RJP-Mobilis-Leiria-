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
test('sequência parcial só estima segmentos ancorados e nunca GTFS externo',()=>{
 const other=officialSchedulesToGTFS({schemaVersion:1,services:raw.services.filter(s=>s.line==='7')});
 const result=interpolatePublishedStops(other,published);
 assert.ok(result.estimatedStopTimes>0);
 for(const st of other.stopTimes){
  assert.ok(result.stopTimes.some(s=>s.trip_id===st.trip_id&&s.stop_id===st.stop_id&&s.departure_time===st.departure_time&&!s.timeIsEstimated));
 }
 const foreign={...other,trips:other.trips.map(t=>({...t,route_id:'imported-route'})),routes:[{route_id:'imported-route',route_short_name:'7'}]};
 assert.equal(interpolatePublishedStops(foreign,published).estimatedStopTimes,0);
});

test('transbordo após hora aproximada exige margem conservadora',()=>{
 const calendar=[{service_id:'d',start_date:'20260101',end_date:'20261231',
 monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'}];
 const mk=(trip_id,stop_id,stop_sequence,time,estimate=false)=>({
 trip_id,stop_id,stop_sequence:String(stop_sequence),
 arrival_time:time,departure_time:time,timeIsEstimated:estimate});
 const fixture={stops:[{stop_id:'a'},{stop_id:'b'},{stop_id:'c'}],
 routes:[{route_id:'r1',route_short_name:'1'},{route_id:'r2',route_short_name:'2'}],
 trips:[{trip_id:'t1',route_id:'r1',service_id:'d'},{trip_id:'t2',route_id:'r2',service_id:'d'},
 {trip_id:'t3',route_id:'r2',service_id:'d'}],
 stopTimes:[
 mk('t1','a',1,'08:00:00'),mk('t1','b',2,'08:10:00',true),
 mk('t2','b',1,'08:14:00'),mk('t2','c',2,'08:20:00'),
 mk('t3','b',1,'08:21:00'),mk('t3','c',2,'08:27:00')
 ],calendar,calendarDates:[]};
 const journeys=plan(fixture,'a','c',new Date(2026,10,4,7,59),2);
 assert.ok(journeys.length);
 assert.equal(journeys[0].legs.at(-1).departure,'08:21:00');
 assert.equal(journeys[0].estimated,true);
});

test('excerto da linha 3 interpola apenas entre Largo da República e Estádio',()=>{
 const services=read('official-line3-2026.json').services;
 const outbound=services.filter(x=>x.direction.startsWith('Telheiro'));
 const line3=officialSchedulesToGTFS({schemaVersion:1,services:outbound});
 const result=interpolatePublishedStops(line3,published);
 assert.ok(result.estimatedStopTimes>0);
 const trip=line3.trips[0].trip_id;
 const original=line3.stopTimes.filter(x=>x.trip_id===trip);
 const estimated=result.stopTimes.filter(x=>x.trip_id===trip&&x.timeIsEstimated);
 assert.ok(estimated.length>0);
 const hours=estimated.map(x=>x.departure_time);
 assert.ok(hours.every(t=>t>='07:20:00'&&t<='07:30:00'));
 assert.ok(original.every(x=>result.stopTimes.some(y=>y.trip_id===x.trip_id&&y.stop_id===x.stop_id&&y.departure_time===x.departure_time)));
});
