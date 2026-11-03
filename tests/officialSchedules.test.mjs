import test from 'node:test';
import assert from 'node:assert/strict';
import {officialSchedulesToGTFS,mergeOfficialGTFS} from '../src/officialSchedules.js';
import {plan} from '../src/gtfs.js';
const service=(line,id,stops)=>({line,id,direction:'Sentido '+line,days:'weekdays',validFrom:'20261101',validUntil:'20261231',source:'https://mobilis.pt/linhas/linha-'+line+'/',stops:stops.map(([stopId,stopName,time])=>({stopId,stopName,time}))});
test('cruza duas linhas oficiais e descobre o transbordo',()=>{
 const raw={schemaVersion:1,services:[
 service('2','line2-0930',[['vidigal','Vidigal','09:30'],['mercado','Mercado Sant’Ana','09:45']]),
 service('7','line7-1000',[['mercado','Mercado Sant’Ana','10:00'],['shopping','Shopping','10:29']])]};
 const data=officialSchedulesToGTFS(raw);
 const result=plan(data,'vidigal','shopping',new Date(2026,10,3,9,20));
 assert.equal(result.length,1);
 assert.deepEqual(result[0].legs.map(x=>x.line),['2','7']);
 assert.equal(result[0].waitingMinutes,15);
 assert.equal(result[0].legs[1].arrival.slice(0,5),'10:29');
});
test('recusa hora inválida e origem sem proveniência',()=>{
 const good=service('2','a',[['v','Vidigal','09:30'],['m','Mercado','09:45']]);
 assert.throws(()=>officialSchedulesToGTFS({schemaVersion:1,services:[{...good,source:'https://example.com/'}]}),/fonte oficial/);
 assert.throws(()=>officialSchedulesToGTFS({schemaVersion:1,services:[{...good,stops:[...good.stops.slice(0,1),{...good.stops[1],time:'11:99'}]}]}),/hora/);
});
test('substitui amostras de linha sem duplicar os serviços',()=>{
 const old={routes:[{route_id:'old',route_short_name:'2'}],trips:[{trip_id:'oldtrip',route_id:'old',service_id:'oldservice'}],stopTimes:[{trip_id:'oldtrip',stop_id:'x'}],stops:[],calendar:[{service_id:'oldservice'}],calendarDates:[]};
 const official=officialSchedulesToGTFS({schemaVersion:1,services:[service('2','a',[['a','Origem','09:30'],['b','Destino','09:40']])]});
 const merged=mergeOfficialGTFS(old,official);
 assert.equal(merged.routes.length,1);assert.equal(merged.trips.length,1);assert.equal(merged.stopTimes.length,2);
});
