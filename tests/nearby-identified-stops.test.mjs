import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbyIdentifiedStops} from '../src/nearbyIdentifiedStops.js';
import {buildStopLineIndex} from '../src/stopLineAssociations.js';
import {readFileSync} from 'node:fs';
const read=f=>JSON.parse(readFileSync(new URL('../public/data/'+f,import.meta.url),'utf8'));
const catalog=read('line-stop-directory.json');
const index=buildStopLineIndex(catalog);
const named={stop_id:'osm:piscinas',stop_name:'Piscinas Municipais',stop_lat:'39.7496782',stop_lon:'-8.8091839'};
test('sugere por distância apenas paragens com linhas identificadas',()=>{
 const osm=[
  named,
  {stop_id:'a',stop_name:'Bairro das Almoínhas',stop_lat:'39.7500',stop_lon:'-8.8092'},
  {stop_id:'b',stop_name:'Paragem sem nome',stop_lat:'39.7501',stop_lon:'-8.8093'},
  {stop_id:'c',stop_name:'Bairro das Almoínhas',stop_lat:'39.78',stop_lon:'-8.8092'}
 ];
 const results=nearbyIdentifiedStops(named,osm,index);
 assert.deepEqual(results.map(s=>s.stop_id),['a']);
 assert.ok(results[0].distance>0);
 assert.ok(results[0].identifiedLines.length>0);
});
test('sem linhas identificadas, não inventa paragens alternativas',()=>{
 assert.deepEqual(nearbyIdentifiedStops(named,[named,{stop_id:'b',stop_name:'Paragem sem nome',stop_lat:'39.7499',stop_lon:'-8.8092'}],index),[]);
});
test('sugestões não certificam horários ou transbordos',()=>{
 const results=nearbyIdentifiedStops(named,[{stop_id:'b',stop_name:'Bairro das Almoínhas',stop_lat:'39.7498',stop_lon:'-8.8092'}],index);
 assert.equal(results[0].associationStatus,'catalogo-nominal');
 assert.equal('departure' in results[0],false);
});
