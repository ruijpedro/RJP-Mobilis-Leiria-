import test from 'node:test';
import assert from 'node:assert/strict';
import {equivalentStopKeys,sameReviewedStopName} from '../src/stopNameLookup.js';
import {nameBasedStopTimetable} from '../src/nameBasedStopTimetable.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';

test('equivalências revistas ligam nomes alternativos em ambos os sentidos',()=>{
 assert.ok(sameReviewedStopName('Porto Moniz / Esc. Francisco Rodrigues Lobo','Porto Moniz / Esc. F. Rodrigues Lobo'));
 assert.ok(sameReviewedStopName('Av. Cidade Maringá / Mercado Municipal','Avenida Cidade de Maringá / Mercado Municipal'));
 assert.ok(!sameReviewedStopName('Piscinas Municipais','Bairro dos Capuchos'));
 assert.deepEqual(equivalentStopKeys('Paragem sem nome'),[]);
});
test('horário digitalizado com alias fica marcado como consulta por nome, sem criar horas',()=>{
 const data={
  stops:[{stop_id:'one',stop_name:'Porto Moniz / Esc. F. Rodrigues Lobo'}],
  routes:[{route_id:'r1',route_short_name:'1',route_long_name:'Centro'}],
  trips:[{trip_id:'trip',route_id:'r1',service_id:'service',trip_headsign:'Centro'}],
  stopTimes:[{trip_id:'trip',stop_id:'one',departure_time:'09:20:00',arrival_time:'09:20:00',timeIsEstimated:true}],
  calendar:[{service_id:'service',start_date:'20260101',end_date:'20261231',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'}],
  calendarDates:[]
 };
 const result=nameBasedStopTimetable(data,'Porto Moniz / Esc. Francisco Rodrigues Lobo',new Date(2026,10,6,8,0));
 assert.equal(result.viaEquivalence,true);
 assert.deepEqual(result.lines,['1']);
 assert.equal(result.departures.length,1);
 assert.equal(result.departures[0].estimated,true);
 assert.deepEqual(nameBasedStopTimetable(data,'Piscinas Municipais',new Date(2026,10,6)).departures,[]);
});
test('interpolação aceita âncoras de nomes revistos sem extrapolar fora delas',()=>{
 const data={
  stops:[{stop_id:'a',stop_name:'Rua Capitão Mouzinho de Alburquerque'},{stop_id:'z',stop_name:'Rua Quinta do Seminário / Centro Comercial'}],
  trips:[{trip_id:'t',route_id:'mobilis-official-2'}],
  routes:[{route_id:'mobilis-official-2',route_short_name:'2'}],
  stopTimes:[{trip_id:'t',stop_id:'a',stop_sequence:'1',departure_time:'08:00:00',arrival_time:'08:00:00'},{trip_id:'t',stop_id:'z',stop_sequence:'2',departure_time:'08:12:00',arrival_time:'08:12:00'}]
 };
 const published={routes:{'2':{stops:['R. Capitão Mouzinho de Albuquerque','Ponte Hintze Ribeiro','Rua Qta. do Seminário / Centro Comercial'],completePublishedSequence:true}}};
 const result=interpolatePublishedStops(data,published);
 const generated=result.stopTimes.filter(st=>st.timeIsEstimated);
 assert.equal(generated.length,1);
 assert.equal(generated[0].departure_time,'08:06:00');
 assert.equal(result.stops.find(s=>s.stop_id===generated[0].stop_id).stop_name,'Ponte Hintze Ribeiro');
 assert.equal(result.stopTimes.filter(st=>!st.timeIsEstimated).length,2);
});
