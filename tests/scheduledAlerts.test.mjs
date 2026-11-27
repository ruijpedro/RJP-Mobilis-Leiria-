import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateScheduledAlerts} from '../src/scheduledAlerts.js';
const data={
 trips:[{trip_id:'t1',service_id:'s'}],
 stopTimes:[{trip_id:'t1',stop_sequence:'2',stop_id:'A',arrival_time:'13:10:00'}],
 calendar:[{service_id:'s',start_date:'20260101',end_date:'20261231',sunday:'1',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1'}],
 calendarDates:[]
};
const base={id:'alarm',tripId:'t1',sequence:'2',line:'2',name:'Praça',lead:10,enabled:true,days:[0,1,2,3,4,5,6]};
test('scheduled stop alerts do not need vehicle GPS or mapped coordinates',()=>{
 const result=evaluateScheduledAlerts([base],data,new Date('2026-11-27T13:04:00Z'));
 assert.equal(result.length,1);
 assert.equal(result[0].minutes,6);
});
test('one-day alert only fires for the configured service day',()=>{
 assert.equal(evaluateScheduledAlerts([{...base,mode:'once',date:'2026-11-27'}],data,new Date('2026-11-27T13:05:00Z')).length,1);
 assert.equal(evaluateScheduledAlerts([{...base,mode:'once',date:'2026-11-28'}],data,new Date('2026-11-27T13:05:00Z')).length,0);
});
test('disabled alerts and expired arrivals are suppressed',()=>{
 assert.equal(evaluateScheduledAlerts([{...base,enabled:false}],data,new Date('2026-11-27T13:05:00Z')).length,0);
 assert.equal(evaluateScheduledAlerts([base],data,new Date('2026-11-27T13:11:00Z')).length,0);
});
test('honours calendar exceptions',()=>{
 const modified={...data,calendarDates:[{service_id:'s',date:'20261127',exception_type:'2'}]};
 assert.equal(evaluateScheduledAlerts([base],modified,new Date('2026-11-27T13:05:00Z')).length,0);
});
test('previous service day can run beyond midnight',()=>{
 const overnight={...data,stopTimes:[{trip_id:'t1',stop_sequence:'2',stop_id:'A',arrival_time:'24:08:00'}]};
 assert.equal(evaluateScheduledAlerts([{...base,mode:'once',date:'2026-11-27'}],overnight,new Date('2026-11-28T00:04:00Z')).length,1);
});
