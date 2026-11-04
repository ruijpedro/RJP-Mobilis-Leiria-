import test from 'node:test';
import assert from 'node:assert/strict';
import {findJourneyStopCoordinates,journeyLegPaths} from '../src/mapJourney.js';
const data={
 stops:[
  {stop_id:'a',stop_name:'Paragem A',stop_lat:'39.74',stop_lon:'-8.81'},
  {stop_id:'b',stop_name:'Paragem B',stop_lat:'',stop_lon:''},
  {stop_id:'c',stop_name:'Paragem C',stop_lat:'39.75',stop_lon:'-8.80'},
  {stop_id:'d',stop_name:'Paragem D',stop_lat:'39.76',stop_lon:'-8.79'}
 ],
 stopTimes:[
  {trip_id:'t7',stop_id:'a',stop_sequence:'1'},
  {trip_id:'t7',stop_id:'b',stop_sequence:'2',timeIsEstimated:true},
  {trip_id:'t7',stop_id:'c',stop_sequence:'3'},
  {trip_id:'t8',stop_id:'c',stop_sequence:'1'},
  {trip_id:'t8',stop_id:'d',stop_sequence:'2'}
 ]};
const osm=[
 {stop_id:'osm:b',stop_name:'Paragem B',stop_lat:'39.745',stop_lon:'-8.805'}
];
const journey={journeyMinutes:30,ridingMinutes:25,waitingMinutes:5,transfers:1,
 legs:[
  {tripId:'t7',line:'7',from:'a',to:'c',departure:'08:00:00',arrival:'08:15:00',estimated:true},
  {tripId:'t8',line:'8',from:'c',to:'d',departure:'08:20:00',arrival:'08:30:00',estimated:false}
 ]};
test('o mapa mantém as paragens intermédias já existentes na viagem',()=>{
 const result=journeyLegPaths(journey,data,osm);
 assert.equal(result.length,2);
 assert.deepEqual(result[0].points.map(p=>p.id),['a','b','c']);
 assert.equal(result[0].totalStops,3);
 assert.equal(result[0].fullyMapped,true);
 assert.equal(result[1].line,'8');
 assert.deepEqual(result[1].points.map(p=>p.id),['c','d']);
});
test('ambiguidade de plataformas não atribui um ponto arbitrário',()=>{
 const two=[...osm,{...osm[0],stop_id:'osm:outro',stop_lat:'39.7452'}];
 assert.equal(findJourneyStopCoordinates(data.stops[1],two),null);
 const legs=journeyLegPaths(journey,data,two);
 assert.equal(legs[0].points.length,2);
 assert.equal(legs[0].fullyMapped,false);
 assert.equal(legs[0].totalStops,3);
});
test('sem coordenadas suficientes o planeador preserva segmentos e horários',()=>{
 const noOsm=journeyLegPaths(journey,data,[]);
 assert.equal(noOsm[0].drawnStops,2);
 assert.equal(noOsm[0].estimated,true);
 assert.equal(noOsm[0].departure,'08:00:00');
 assert.equal(noOsm[1].arrival,'08:30:00');
});
test('a representação cartográfica nunca cria novas viagens',()=>{
 assert.equal(data.stopTimes.length,5);
 assert.equal(journey.legs.length,2);
 assert.equal(journeyLegPaths(null,data,osm).length,0);
});
