import test from 'node:test';
import assert from 'node:assert/strict';
import {nameBasedStopTimetable} from '../src/nameBasedStopTimetable.js';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const source=read('official-verified-schedules.json');
const input=officialSchedulesToGTFS({schemaVersion:1,services:source.services.filter(s=>String(s.line)==='4')});
const data=interpolatePublishedStops(input,read('published-stop-sequences.json'));
const date=new Date(2026,10,4,6,0);
test('consulta por nome reutiliza unicamente horas existentes, incluindo estimativas identificadas',()=>{
 const estimated=data.stopTimes.find(s=>s.timeIsEstimated);
 assert.ok(estimated);
 const stop=data.stops.find(s=>s.stop_id===estimated.stop_id);
 const result=nameBasedStopTimetable(data,stop.stop_name,date);
 assert.ok(result.lines.includes('4'));
 assert.ok(result.departures.some(d=>d.estimated));
 assert.ok(result.matchedStopIds.includes(stop.stop_id));
});
test('paragens OSM sem nome não recebem qualquer horário inventado',()=>{
 const result=nameBasedStopTimetable(data,'Paragem sem nome',date);
 assert.equal(result.departures.length,0);
 assert.equal(result.lines.length,0);
});
test('uma paragem não duplica passagens repetidas com o mesmo ID de viagem e hora',()=>{
 const stop=data.stops.find(s=>s.stop_id===data.stopTimes[0].stop_id);
 const aliased={...data,stops:[...data.stops,{...stop,stop_id:'duplicate'}],
 stopTimes:[...data.stopTimes,...data.stopTimes.filter(st=>st.stop_id===stop.stop_id).map(st=>({...st,stop_id:'duplicate'}))]};
 const original=nameBasedStopTimetable(data,stop.stop_name,date);
 const result=nameBasedStopTimetable(aliased,stop.stop_name,date);
 assert.equal(result.departures.length,original.departures.length);
});
test('não apresenta horários fora da validade do operador',()=>{
 const stop=data.stops[0];
 const result=nameBasedStopTimetable(data,stop.stop_name,new Date(2028,0,2,8,0));
 assert.equal(result.departures.length,0);
});
