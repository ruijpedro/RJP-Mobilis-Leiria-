import test from 'node:test';
import assert from 'node:assert/strict';
import {activeService,plan} from '../src/gtfs.js';
const on = new Date('2026-10-30T08:55:00');
test('não assume operação sem calendário GTFS',()=>{
 assert.equal(activeService('unknown',on,[],[]),false);
 assert.equal(activeService('unknown',on,[{service_id:'other'}],[]),false);
});
test('não prevê chegada em viagens sem dias de circulação confirmados',()=>{
 const data={routes:[{route_id:'7',route_short_name:'7'}],trips:[{trip_id:'x',route_id:'7',service_id:'unknown'}],stopTimes:[{trip_id:'x',stop_id:'a',stop_sequence:'1',departure_time:'09:00:00',arrival_time:'09:00:00'},{trip_id:'x',stop_id:'b',stop_sequence:'2',departure_time:'09:20:00',arrival_time:'09:20:00'}],calendar:[],calendarDates:[]};
 assert.equal(plan(data,'a','b',on).length,0);
});
