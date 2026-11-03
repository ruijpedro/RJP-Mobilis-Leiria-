import test from 'node:test';
import assert from 'node:assert/strict';
import {plan} from '../src/gtfs.js';

const d=new Date(2026,10,3,7,50);
const calendar=[{service_id:'work',start_date:'20260101',end_date:'20271231',
 monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'}];
const st=(trip_id,stop_id,stop_sequence,time)=>({trip_id,stop_id,stop_sequence:String(stop_sequence),arrival_time:time,departure_time:time});
const data={
 routes:[{route_id:'seven',route_short_name:'7'},{route_id:'eight',route_short_name:'8'},{route_id:'ten',route_short_name:'10'}],
 trips:[{trip_id:'a',route_id:'seven',service_id:'work'},{trip_id:'b',route_id:'eight',service_id:'work'},{trip_id:'c',route_id:'ten',service_id:'work'}],
 calendar,calendarDates:[],
 stopTimes:[
 st('a','origin',1,'08:00:00'),st('a','change',2,'08:10:00'),
 st('b','origin',1,'08:05:00'),st('b','change',2,'08:11:00'),
 st('c','change',1,'08:15:00'),st('c','target',2,'08:30:00')]
};
test('permite alternativas que chegam à mesma paragem de transbordo',()=>{
 const found=plan(data,'origin','target',d,2);
 assert.ok(found.length>=2);
 assert.deepEqual([...new Set(found.map(f=>f.legs[0].line))].sort(),['7','8']);
 assert.equal(found[0].transfers,1);
});
test('não permite transbordos antes da chegada',()=>{
 const impossible=structuredClone(data);
 impossible.stopTimes=impossible.stopTimes.map(s=>s.trip_id==='c'?{...s,arrival_time:s.stop_id==='change'?'08:09:00':'08:29:00',departure_time:s.stop_id==='change'?'08:09:00':'08:29:00'}:s);
 assert.equal(plan(impossible,'origin','target',d).length,0);
});
test('não cria itinerários com serviço inativo',()=>{
 const off={...data,calendar:[],calendarDates:[]};
 assert.equal(plan(off,'origin','target',d).length,0);
});
