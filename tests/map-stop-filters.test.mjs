import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMappedStops} from '../src/mapStopFilters.js';

const stops=[
 {stop_id:'osm:1',stop_name:'Porto Moniz / Esc. Francisco Rodrigues Lobo'},
 {stop_id:'osm:2',stop_name:'Centro'},
 {stop_id:'osm:3',stop_name:'Hospital'}
];
const audit=new Map([
 ['osm:1',{lines:['7','2'],published:4,estimated:2}],
 ['osm:2',{lines:['7'],published:0,estimated:0}],
 ['osm:3',{lines:[],published:0,estimated:0}]
]);
test('selecionar linha filtra as paragens, não apenas o traçado',()=>{
 assert.deepEqual(filterMappedStops(stops,audit,{lineName:'7'}).map(s=>s.stop_id),['osm:1','osm:2']);
 assert.deepEqual(filterMappedStops(stops,audit,{lineName:'2'}).map(s=>s.stop_id),['osm:1']);
 assert.deepEqual(filterMappedStops(stops,audit,{lineName:'10'}),[]);
});
test('filtros de cobertura e linha combinam sem inventar horários',()=>{
 assert.deepEqual(filterMappedStops(stops,audit,{lineName:'7',coverage:'published'}).map(s=>s.stop_id),['osm:1']);
 assert.deepEqual(filterMappedStops(stops,audit,{coverage:'no-times'}).map(s=>s.stop_id),['osm:2','osm:3']);
 assert.deepEqual(filterMappedStops(stops,audit,{coverage:'no-lines'}).map(s=>s.stop_id),['osm:3']);
});
test('pesquisa preserva a grafia alternativa revista',()=>{
 assert.deepEqual(filterMappedStops(stops,audit,{search:'Francisco Rodrigues Lobo'}).map(s=>s.stop_id),['osm:1']);
 assert.deepEqual(filterMappedStops(stops,audit,{search:'Hospital'}).map(s=>s.stop_id),['osm:3']);
});
