import test from 'node:test';
import assert from 'node:assert/strict';
import {plan} from '../src/gtfs.js';
const date=new Date(2026,10,10,8,0);
const data={routes:[{route_id:'a'},{route_id:'b'}],trips:[{trip_id:'a',route_id:'a',service_id:'s'},{trip_id:'b',route_id:'b',service_id:'s'}],calendar:[],calendarDates:[{service_id:'s',date:'20261110',exception_type:'1'}],stopTimes:[
{trip_id:'a',stop_id:'origin',stop_sequence:1,departure_time:'08:00:00',arrival_time:'08:00:00'},
{trip_id:'a',stop_id:'x',stop_sequence:2,departure_time:'08:10:00',arrival_time:'08:10:00'},
{trip_id:'b',stop_id:'y',stop_sequence:1,departure_time:'08:20:00',arrival_time:'08:20:00'},
{trip_id:'b',stop_id:'destination',stop_sequence:2,departure_time:'08:40:00',arrival_time:'08:40:00'}]};
test('planeia transbordo pedonal entre paragens distintas',()=>{
 const walk={from:'x',to:'y',totalSeconds:360,walkingSeconds:240,estimated:true};
 assert.equal(plan(data,'origin','destination',date).length,0);
 const results=plan(data,'origin','destination',date,2,{},new Map([['x',[walk]]]));
 assert.equal(results[0].journeyMinutes,40);
 assert.equal(results[0].legs[1].walkingTransfer.to,'y');
 assert.equal(results[0].estimated,true);
 assert.equal(plan(data,'origin','destination',date,2,{},new Map([['x',[{...walk,totalSeconds:700}]]])).length,0);
});
