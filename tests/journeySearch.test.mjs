import test from 'node:test';
import assert from 'node:assert/strict';
import {findJourneyOptions,resolveStopCandidates} from '../src/journeySearch.js';

const stops=[
 {stop_id:'a',stop_name:'Vidigal de Baixo'},
 {stop_id:'b',stop_name:'Campo Amarelo'},
 {stop_id:'c',stop_name:'Teatro José Lúcio da Silva'}
];
const data={
 stops,
 routes:[{route_id:'r7',route_short_name:'7'},{route_id:'r10',route_short_name:'10'}],
 trips:[{trip_id:'t7',route_id:'r7',service_id:'daily'},{trip_id:'t10',route_id:'r10',service_id:'daily'}],
 stopTimes:[
  {trip_id:'t7',stop_id:'a',stop_sequence:'1',arrival_time:'08:00:00',departure_time:'08:00:00'},
  {trip_id:'t7',stop_id:'b',stop_sequence:'2',arrival_time:'08:12:00',departure_time:'08:12:00'},
  {trip_id:'t10',stop_id:'b',stop_sequence:'1',arrival_time:'08:17:00',departure_time:'08:17:00'},
  {trip_id:'t10',stop_id:'c',stop_sequence:'2',arrival_time:'08:28:00',departure_time:'08:28:00'}
 ],
 calendar:[{service_id:'daily',start_date:'20260101',end_date:'20271231',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'}],
 calendarDates:[]
};
const date=new Date(2026,10,2,7,55);
test('pesquisa com nomes parciais resolve paragens',()=>{
 assert.equal(resolveStopCandidates(stops,'vidigal')[0].stop_id,'a');
});
test('planeador calcula transbordo real sem inventar horários',()=>{
 const r=findJourneyOptions(data,'Vidigal','Teatro',date);
 assert.equal(r.routes.length,1);
 assert.deepEqual(r.routes[0].legs.map(l=>l.line),['7','10']);
 assert.equal(r.routes[0].transfers,1);
});
test('não cria linha 10 quando não consta da base',()=>{
 const partial={...data,trips:data.trips.slice(0,1),stopTimes:data.stopTimes.slice(0,2)};
 assert.equal(findJourneyOptions(partial,'Vidigal','Teatro',date).routes.length,0);
});

test('planeador reconhece Campus 2 IPL quando base indica Campus 2 ULO',()=>{
 const rows=[{stop_id:'campus',stop_name:'Campus 2 ULO'},{stop_id:'escola',stop_name:'Esc. Afonso Lopes Vieira'}];
 assert.deepEqual(resolveStopCandidates(rows,'Campus 2 IPL').map(s=>s.stop_id),['campus']);
 assert.deepEqual(resolveStopCandidates(rows,'Escola Afonso Lopes Vieira').map(s=>s.stop_id),['escola']);
});

test('data fora da vigência devolve aviso sem inventar serviço nem itinerário',()=>{
 const result=findJourneyOptions(data,'Vidigal de Baixo','Campo Amarelo',new Date(2029,0,5,8,0));
 assert.equal(result.routes.length,0);
 assert.match(result.reason,/não abrangem a data selecionada/);
});
