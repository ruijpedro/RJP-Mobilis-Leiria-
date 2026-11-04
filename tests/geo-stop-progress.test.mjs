import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOsmPositionIndex,routeDistanceFractions} from '../src/geoStopProgress.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';

const route={routes:{'7':{completePublishedSequence:true,stops:['Avenida Principal','Rua Intermédia','Paragem Final']}}};
const stops=[
 {stop_id:'a',stop_name:'Avenida Principal'},
 {stop_id:'b',stop_name:'Paragem Final'}
];
const osm=[
 {stop_id:'osm:a',stop_name:'Avenida Principal',stop_lat:'39.7000',stop_lon:'-8.8000'},
 {stop_id:'osm:m',stop_name:'Rua Intermédia',stop_lat:'39.7009',stop_lon:'-8.8000'},
 {stop_id:'osm:b',stop_name:'Paragem Final',stop_lat:'39.7045',stop_lon:'-8.8000'}
];
const data={
 stops,routes:[{route_id:'mobilis-official-7',route_short_name:'7'}],
 trips:[{trip_id:'t',route_id:'mobilis-official-7',service_id:'d'}],
 stopTimes:[
 {trip_id:'t',stop_id:'a',stop_sequence:'1',arrival_time:'08:00:00',departure_time:'08:00:00'},
 {trip_id:'t',stop_id:'b',stop_sequence:'2',arrival_time:'08:20:00',departure_time:'08:20:00'}
 ],calendar:[],calendarDates:[]
};
test('distâncias geográficas pesam mais do que o número de paragens',()=>{
 const res=interpolatePublishedStops(data,route,{osmStops:osm});
 assert.equal(res.estimatedStopTimes,1);
 const middle=res.stopTimes.find(st=>st.timeIsEstimated);
 assert.equal(middle.estimateMethod,'geographical-distance');
 assert.equal(middle.departure_time,'08:04:00');
 assert.equal(res.stopTimes[0].departure_time,'08:00:00');
 assert.equal(res.stopTimes.at(-1).departure_time,'08:20:00');
 assert.equal(middle.estimateFrom,'a');
 assert.equal(middle.estimateTo,'b');
});
test('sem geografia suficiente preserva interpolação por sequência',()=>{
 const res=interpolatePublishedStops(data,route);
 const middle=res.stopTimes.find(st=>st.timeIsEstimated);
 assert.equal(middle.estimateMethod,'linear-stop-order');
 assert.equal(middle.departure_time,'08:10:00');
});
test('múltiplas plataformas afastadas não podem ser tratadas como posição única',()=>{
 const twoSides=[...osm,{stop_id:'osm:outro',stop_name:'Rua Intermédia',stop_lat:'39.7090',stop_lon:'-8.8000'}];
 const positions=buildOsmPositionIndex(twoSides);
 assert.equal(positions.has('rua intermedia'),false);
 const res=interpolatePublishedStops(data,route,{osmStops:twoSides});
 assert.equal(res.stopTimes.find(st=>st.timeIsEstimated).estimateMethod,'linear-stop-order');
});
test('candidatos próximos para ambos os lados permitem ponderação geométrica mas não certificam plataforma',()=>{
 const paired=[...osm,{stop_id:'osm:other',stop_name:'Rua Intermédia',stop_lat:'39.70095',stop_lon:'-8.8000'}];
 const positions=buildOsmPositionIndex(paired);
 assert.equal(positions.get('rua intermedia').quality,'shared-name-nearby-osm');
 assert.ok(routeDistanceFractions(route.routes['7'].stops,positions,0,2)?.[1]<0.3);
 const result=interpolatePublishedStops(data,route,{osmStops:paired});
 assert.equal(result.stopTimes.find(x=>x.timeIsEstimated).estimateMethod,'geographical-distance');
 assert.equal(result.stops.find(x=>x.interpolatedStop).stop_lat,'');
});
