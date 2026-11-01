import test from 'node:test';
import assert from 'node:assert/strict';
import {plan} from '../src/gtfs.js';
const data={stops:[],routes:[{route_id:'7',route_short_name:'7'},{route_id:'10',route_short_name:'10'}], trips:[{trip_id:'a',route_id:'7',service_id:'x'},{trip_id:'b',route_id:'10',service_id:'x'},{trip_id:'c',route_id:'10',service_id:'x'}],calendar:[],calendarDates:[],stopTimes:[
 {trip_id:'a',stop_id:'vidigal',stop_sequence:'1',departure_time:'14:20:00',arrival_time:'14:20:00'},
 {trip_id:'a',stop_id:'campo',stop_sequence:'2',departure_time:'14:35:00',arrival_time:'14:35:00'},
 {trip_id:'b',stop_id:'campo',stop_sequence:'1',departure_time:'14:40:00',arrival_time:'14:40:00'},
 {trip_id:'b',stop_id:'teatro',stop_sequence:'2',departure_time:'14:55:00',arrival_time:'14:55:00'},
 {trip_id:'c',stop_id:'campo',stop_sequence:'1',departure_time:'15:00:00',arrival_time:'15:00:00'},
 {trip_id:'c',stop_id:'teatro',stop_sequence:'2',departure_time:'15:15:00',arrival_time:'15:15:00'}]};
const day=new Date(2026,9,31,14,10);
test('sem atraso utiliza ligação programada',()=>{const r=plan(data,'vidigal','teatro',day);assert.equal(r[0].legs.at(-1).arrival,'14:55:00')});
test('atraso 10 minutos na viagem 7 perde a ligação e encontra a seguinte',()=>{const r=plan(data,'vidigal','teatro',day,2,{a:10});assert.equal(r[0].legs.at(-1).arrival,'15:15:00');assert.equal(r[0].legs[0].departure,'14:30:00')});
test('não afeta outra viagem',()=>{const r=plan(data,'campo','teatro',new Date(2026,9,31,14,38),2,{a:10});assert.equal(r[0].legs[0].departure,'14:40:00')});
