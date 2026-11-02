import test from 'node:test';
import assert from 'node:assert/strict';
import {validStops,linesForStop,routeShapes} from '../src/mapdata.js';
test('mapa só apresenta paragens geolocalizadas',()=>assert.equal(validStops([{stop_lat:'39.74',stop_lon:'-8.80'},{stop_lat:'',stop_lon:''}]).length,1));
test('linhas e destinos dependem do serviço válido',()=>{
 const data={routes:[{route_id:'7',route_short_name:'7'}],trips:[{trip_id:'t',route_id:'7',service_id:'daily',trip_headsign:'Leiria'}],stopTimes:[{stop_id:'v',trip_id:'t',departure_time:'09:00:00'}],calendar:[{service_id:'daily',start_date:'20260101',end_date:'20261231',monday:'1',tuesday:'1',wednesday:'1',thursday:'1',friday:'1',saturday:'1',sunday:'1'}],calendarDates:[]};
 assert.equal(linesForStop(data,'v',new Date(2026,10,2,8,30)).length,1);
 assert.equal(linesForStop(data,'v',new Date(2026,10,2,8,30))[0].destination,'Leiria');
});
test('sem shapes não inventa traçado oficial',()=>assert.deepEqual(routeShapes({shapes:[],trips:[]},'7'),[]));
