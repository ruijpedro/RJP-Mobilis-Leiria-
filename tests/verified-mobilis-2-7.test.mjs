import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {plan,upcoming} from '../src/gtfs.js';
const file=JSON.parse(readFileSync(new URL('../public/data/official-verified-schedules.json',import.meta.url),'utf8'));
const gtfs=officialSchedulesToGTFS(file);
const date=new Date(2026,10,3,6,50); // Terça-feira
test('dados oficiais incluem circulações das linhas 2 e 7',()=>{
 assert.equal(file.services.filter(s=>s.line==='2').length,36);
 assert.equal(file.services.filter(s=>s.line==='7').length,16);
 assert.equal(gtfs.trips.filter(t=>['2','7'].includes(gtfs.routes.find(r=>r.route_id===t.route_id)?.route_short_name)).length,52);
});
test('linha 7 Vidigal → Pousos cruza tempos publicados',()=>{
 const routes=plan(gtfs,'mobilis:l7:vidigal','mobilis:l7:pousos',date);
 assert.ok(routes.length);
 const first=routes[0].legs[0];
 assert.equal(first.line,'7');
 assert.equal(first.departure.slice(0,5),'07:17');
 assert.equal(first.arrival.slice(0,5),'07:34');
});
test('linha 2 Terminal → Campus 2 ULO usa horas oficiais',()=>{
 const routes=plan(gtfs,'mobilis:l2:terminal','mobilis:l2:campus-2',date);
 assert.ok(routes.length);
 const first=routes[0].legs[0];
 assert.equal(first.line,'2');
 assert.equal(first.departure.slice(0,5),'06:50');
 assert.equal(first.arrival.slice(0,5),'07:30');
});
test('linha 7 não inventa partidas entre os pontos de referência',()=>{
 assert.deepEqual(upcoming(gtfs,'mobilis:l7:vidigal',date,3).map(x=>x.time.slice(0,5)),['07:17','08:07','09:02']);
});
test('linha 2 não assume serviço ao domingo sem tabela publicada',()=>{
 const sunday=new Date(2026,10,8,7,0);
 assert.equal(upcoming(gtfs,'mobilis:l2:terminal',sunday,100).filter(x=>x.line==='2').length,0);
});
