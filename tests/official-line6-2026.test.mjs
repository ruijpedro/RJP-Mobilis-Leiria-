import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {plan} from '../src/gtfs.js';
const raw=JSON.parse(readFileSync(new URL('../public/data/official-line6-2026.json',import.meta.url),'utf8'));
const data=officialSchedulesToGTFS(raw);
test('linha 6 contém 33 circulações dos dois sentidos',()=>{
 assert.equal(data.trips.length,33);
 assert.equal(raw.services.filter(x=>x.direction.startsWith('Leiria')).length,16);
 assert.equal(raw.services.filter(x=>x.direction.startsWith('Parceiros')).length,17);
});
test('linha 6 outbound 07:10 Leiria → 07:35 Azoia',()=>{
 const routes=plan(data,'mobilis:l2:terminal','mobilis:l6:azoia',new Date(2026,10,4,7,5));
 assert.ok(routes.length);
 assert.equal(routes[0].legs[0].departure.slice(0,5),'07:10');
 assert.equal(routes[0].legs[0].arrival.slice(0,5),'07:35');
});
test('linha 6 inbound 06:45 Azoia → 07:10 Leiria',()=>{
 const routes=plan(data,'mobilis:l6:azoia','mobilis:l2:terminal',new Date(2026,10,4,6,40));
 assert.ok(routes.length);
 assert.equal(routes[0].legs[0].arrival.slice(0,5),'07:10');
});
test('desvio CE Parceiros só na circulação publicada',()=>{
 const special=raw.services.find(s=>s.id.startsWith('l6-out-weekdays-0815'));
 const normal=raw.services.find(s=>s.id.startsWith('l6-out-weekdays-0710'));
 assert.equal(special.stops.some(s=>s.stopName==='CE Parceiros'),true);
 assert.equal(normal.stops.some(s=>s.stopName==='CE Parceiros'),false);
});
