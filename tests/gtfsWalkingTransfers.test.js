import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWalkingTransfers} from '../src/gtfsWalkingTransfers.js';
const stops=[{stop_id:'a',stop_lat:39.74,stop_lon:-8.81},{stop_id:'b',stop_lat:39.741,stop_lon:-8.81,operatorId:'rdl'},{stop_id:'c',stop_lat:39.7401,stop_lon:-8.81},{stop_id:'d',stop_lat:40,stop_lon:-8.81,operatorId:'rdl'}];
test('liga operadores próximos nos dois sentidos, sem ligações urbanas duplicadas',()=>{
 const links=buildWalkingTransfers(stops);
 assert.deepEqual(links.get('a').map(x=>x.to),['b']);
 assert.ok(links.get('b').some(x=>x.to==='a'));
 assert.equal(links.has('d'),false);
 assert.ok(links.get('a')[0].totalSeconds>120);
 assert.equal(links.get('a')[0].estimated,true);
});
test('rejeita velocidade inválida',()=>assert.throws(()=>buildWalkingTransfers(stops,{walkingSpeed:0})));
