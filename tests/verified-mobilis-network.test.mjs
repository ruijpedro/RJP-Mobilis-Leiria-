import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {plan,upcoming} from '../src/gtfs.js';
const official=JSON.parse(readFileSync(new URL('../public/data/official-verified-schedules.json',import.meta.url),'utf8'));
const data=officialSchedulesToGTFS(official);
const weekday=new Date(2026,10,3,7,55);
test('integra 90 circulações verificadas das linhas 2,4,7,8,9',()=>{
 assert.equal(data.trips.length,90);
 assert.deepEqual([...new Set(data.routes.map(x=>x.route_short_name))].sort(),['2','4','7','8','9']);
});
test('linha 4 Terminal → Vale Sepal usa 09:00 → 09:29',()=>{
 const options=plan(data,'mobilis:l2:terminal','mobilis:l4:vale-sepal',new Date(2026,10,3,8,55));
 assert.ok(options.length);
 assert.equal(options[0].legs[0].line,'4');
 assert.equal(options[0].legs[0].departure.slice(0,5),'09:00');
 assert.equal(options[0].legs[0].arrival.slice(0,5),'09:29');
});
test('linha 8 Cortes → Largo José Lúcio usa 08:50 → 09:04',()=>{
 const options=plan(data,'mobilis:l8:cortes','mobilis:l7:largo-jose-lucio',weekday);
 assert.ok(options.length);
 assert.equal(options[0].legs[0].line,'8');
 assert.equal(options[0].legs[0].arrival.slice(0,5),'09:04');
});
test('linha 9 Estádio → Campus 2 ULO usa 08:30 → 08:54',()=>{
 const options=plan(data,'mobilis:l7:estadio','mobilis:l2:campus-2',new Date(2026,10,3,8,28));
 assert.ok(options.length);
 assert.equal(options[0].legs[0].line,'9');
 assert.equal(options[0].legs[0].arrival.slice(0,5),'08:54');
});
test('cruza carreiras 2 e 4 no mesmo terminal, respeitando espera',()=>{
 const options=plan(data,'mobilis:l2:campus-2','mobilis:l4:vale-sepal',new Date(2026,10,3,7,15));
 assert.ok(options.some(o=>o.legs.length===2&&o.legs[0].line==='2'&&o.legs[1].line==='4'));
});
test('não inventa partidas da linha 9 ao domingo',()=>{
 assert.equal(upcoming(data,'mobilis:l9:marques-pombal',new Date(2026,10,8,8,0)).filter(x=>x.line==='9').length,0);
});
