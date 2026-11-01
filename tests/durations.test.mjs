import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,durationMinutes} from '../src/gtfs.js';
const sample={routes:[{route_id:'7',route_short_name:'7'},{route_id:'2',route_short_name:'2'}],stops:[],calendar:[],calendarDates:[],trips:[{trip_id:'v7',route_id:'7',service_id:'x'},{trip_id:'v2',route_id:'2',service_id:'x'}],stopTimes:[
{trip_id:'v7',stop_id:'A',stop_sequence:'1',arrival_time:'07:10:00',departure_time:'07:10:00'},
{trip_id:'v7',stop_id:'B',stop_sequence:'2',arrival_time:'07:25:00',departure_time:'07:25:00'},
{trip_id:'v2',stop_id:'B',stop_sequence:'1',arrival_time:'07:30:00',departure_time:'07:30:00'},
{trip_id:'v2',stop_id:'C',stop_sequence:'2',arrival_time:'07:45:00',departure_time:'07:45:00'}]};
test('duração de troço calculada com as passagens da mesma viagem',()=>assert.equal(durationMinutes('07:10:00','07:25:00'),15));
test('planeador calcula tempo a bordo, espera e duração total',()=>{const r=plan(sample,'A','C',new Date(2026,9,30,7,0))[0];assert.equal(r.ridingMinutes,30);assert.equal(r.waitingMinutes,5);assert.equal(r.journeyMinutes,35);assert.equal(r.transfers,1)});
test('atraso altera ligação e duração, sem inventar saída',()=>{const r=plan(sample,'A','C',new Date(2026,9,30,7,0),2,{v7:10});assert.equal(r,undefined)});
