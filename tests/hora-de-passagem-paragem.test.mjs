import test from 'node:test';
import assert from 'node:assert/strict';
import {stopTimetableSummary} from '../src/stopTimetable.js';
import {plan} from '../src/gtfs.js';

const today=new Date(2026,10,4,7,55);
const calendar=[{service_id:'wd',start_date:'20260101',end_date:'20271231',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'0',sunday:'0'}];
const data={
 routes:[{route_id:'r7',route_short_name:'7'},{route_id:'r9',route_short_name:'9'}],
 trips:[
 {trip_id:'v7',route_id:'r7',service_id:'wd',trip_headsign:'Vidigal',sourceUrl:'https://mobilis.pt/linhas/linha-7/'},
 {trip_id:'v9',route_id:'r9',service_id:'wd',trip_headsign:'Campus',sourceUrl:'https://mobilis.pt/linhas/linha-9/'}],
 stops:[{stop_id:'terminal',stop_name:'Terminal'},{stop_id:'paragem',stop_name:'Paragem intermédia'},{stop_id:'destino',stop_name:'Destino'}],
 stopTimes:[
 {trip_id:'v7',stop_id:'terminal',stop_sequence:'1',arrival_time:'08:00:00',departure_time:'08:00:00'},
 {trip_id:'v7',stop_id:'paragem',stop_sequence:'2',arrival_time:'08:12:00',departure_time:'08:12:00'},
 {trip_id:'v7',stop_id:'destino',stop_sequence:'3',arrival_time:'08:22:00',departure_time:'08:22:00'},
 {trip_id:'v9',stop_id:'terminal',stop_sequence:'1',arrival_time:'08:02:00',departure_time:'08:02:00'},
 {trip_id:'v9',stop_id:'paragem',stop_sequence:'2',arrival_time:'08:18:00',departure_time:'08:18:00'},
 {trip_id:'v9',stop_id:'destino',stop_sequence:'3',arrival_time:'08:29:00',departure_time:'08:29:00'}
 ],calendar,calendarDates:[]
};
test('mostra a hora desta paragem e as duas linhas, não a partida do terminal',()=>{
 const t=stopTimetableSummary(data,'paragem',today);
 assert.equal(t.departures,2);
 assert.deepEqual(t.groups.map(g=>[g.line,g.departures[0].time]),[['7','08:12:00'],['9','08:18:00']]);
 assert.equal(t.groups[0].sources[0],'https://mobilis.pt/linhas/linha-7/');
});
test('planeador embarca às 08:12 na paragem, não às 08:00 no terminal',()=>{
 const options=plan(data,'paragem','destino',today);
 assert.ok(options.length>=2);
 assert.equal(options[0].legs[0].departure,'08:12:00');
 assert.equal(options[0].legs[0].arrival,'08:22:00');
});
test('sem horário por paragem, não copia automaticamente o horário do terminal',()=>{
 const other=stopTimetableSummary(data,'paragem-inexistente',today);
 assert.equal(other.departures,0);
});
