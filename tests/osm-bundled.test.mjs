import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOSM,parseOSM} from '../src/osm.js';

test('OSM abre primeiro a cópia guardada no projeto, sem chamar Overpass',async()=>{
 const previousFetch=globalThis.fetch;
 const previousStorage=globalThis.localStorage;
 const requested=[];
 const stops=[{stop_id:'osm:node:1',stop_name:'Vidigal',stop_lat:'39.73',stop_lon:'-8.80'}];
 globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
 globalThis.fetch=async url=>{
  requested.push(String(url));
  assert.ok(String(url).includes('/data/osm-stops-leiria.json'));
  return {ok:true,json:async()=>stops};
 };
 try{
  const result=await loadOSM();
  assert.equal(result.stops.length,1);
  assert.equal(result.cache,true);
  assert.equal(requested.length,1);
 }finally{
  globalThis.fetch=previousFetch;
  globalThis.localStorage=previousStorage;
 }
});
test('parseOSM rejeita coordenadas ausentes e conserva paragens válidas',()=>{
 const result=parseOSM({elements:[
  {type:'node',id:1,lat:39.73,lon:-8.80,tags:{name:'Vidigal'}},
  {type:'node',id:2,tags:{name:'Sem posição'}}
 ]});
 assert.deepEqual(result.map(s=>s.stop_name),['Vidigal']);
});
