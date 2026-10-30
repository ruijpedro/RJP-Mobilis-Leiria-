import test from 'node:test';
import assert from 'node:assert/strict';
import {combineStops,distanceMeters,matchMappedStop} from '../src/stopMatch.js';
const official=[{stop_id:'a',stop_name:'Vidigal',stop_lat:'39.74000',stop_lon:'-8.80000'}];
test('paragem OSM coincidente e com nome igual não duplica a oficial',()=>{
 const osm=[{stop_id:'osm:1',stop_name:'Vidigal',stop_lat:'39.74005',stop_lon:'-8.80003',osm:true}];
 assert.deepEqual(combineStops(official,osm).map(s=>s.stop_id),['a']);
});
test('proximidade não basta para inventar correspondência de paragens',()=>{
 const osm=[{stop_id:'osm:2',stop_name:'Campo Amarelo',stop_lat:'39.74005',stop_lon:'-8.80003',osm:true}];
 assert.equal(combineStops(official,osm).length,2);
});
test('distâncias nulas e paragens distintas',()=>{assert.equal(distanceMeters(official[0],official[0]),0);assert(distanceMeters(official[0],{stop_lat:'39.75',stop_lon:'-8.80'})>1000)});

test('associa paragem com nome e posição concordantes',()=>{
 assert.equal(matchMappedStop({stop_name:'Vidigal',stop_lat:'39.74005',stop_lon:'-8.80003'},official)?.stop.stop_id,'a');
});
test('não associa nomes diferentes ou plataformas ambíguas',()=>{
 assert.equal(matchMappedStop({stop_name:'Campo Amarelo',stop_lat:'39.74005',stop_lon:'-8.80003'},official),null);
 assert.equal(matchMappedStop({stop_name:'Vidigal',stop_lat:'39.74005',stop_lon:'-8.80003'},[...official,{...official[0],stop_id:'b'}]),null);
});
