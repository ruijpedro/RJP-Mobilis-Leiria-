import test from 'node:test';
import assert from 'node:assert/strict';
import {stopCoverage,networkCoverageSummary} from '../src/stopCoverage.js';
import {findJourneyOptions} from '../src/journeySearch.js';
const day={service_id:'d',start_date:'20260101',end_date:'20271231',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'};
const st=(trip_id,stop_id,stop_sequence,time)=>({trip_id,stop_id,stop_sequence:String(stop_sequence),arrival_time:time,departure_time:time});
test('diagnóstico distingue paragens com horários, sem horários e com coordenadas',()=>{
 const data={stops:[{stop_id:'a',stop_name:'Origem',stop_lat:'39.74',stop_lon:'-8.8'},{stop_id:'b',stop_name:'Destino',stop_lat:'',stop_lon:''},{stop_id:'c',stop_name:'Por validar',stop_lat:'',stop_lon:''}],
  routes:[{route_id:'r7',route_short_name:'7'}],trips:[{trip_id:'t7',route_id:'r7',service_id:'d'}],
  stopTimes:[st('t7','a',1,'07:00:00'),st('t7','b',2,'07:20:00')]};
 const summary=networkCoverageSummary(data);
 assert.equal(summary.total,3);assert.equal(summary.withTimetables,2);
 assert.equal(summary.withoutTimetables,1);assert.equal(summary.withCoordinates,1);
 assert.deepEqual(stopCoverage(data).find(s=>s.stopId==='a').lines,['7']);
});
test('planeador apresenta mais de oito partidas quando existem nos dados',()=>{
 const trips=[],stopTimes=[];
 for(let n=0;n<12;n++){
  const id='trip'+n,time=String(7+Math.floor(n/2)).padStart(2,'0')+':'+(n%2?'30':'00')+':00';
  const arrival=String(7+Math.floor(n/2)).padStart(2,'0')+':'+(n%2?'50':'20')+':00';
  trips.push({trip_id:id,route_id:'r7',service_id:'d'});
  stopTimes.push(st(id,'a',1,time),st(id,'b',2,arrival));
 }
 const data={stops:[{stop_id:'a',stop_name:'Origem'},{stop_id:'b',stop_name:'Destino'}],
 routes:[{route_id:'r7',route_short_name:'7'}],trips,stopTimes,calendar:[day],calendarDates:[]};
 const found=findJourneyOptions(data,'Origem','Destino',new Date(2026,10,4,6,55));
 assert.equal(found.routes.length,12);
 assert.equal(found.routes[0].legs[0].departure,'07:00:00');
});
