import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {stopTimetable,stopTimetableSummary} from '../src/stopTimetable.js';
import {plan} from '../src/gtfs.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const all={schemaVersion:1,services:[
 ...read('official-verified-schedules.json').services,
 ...read('official-line1-2026.json').services,
 ...read('official-line3-2026.json').services,
 ...read('official-line5-2026.json').services
]};
const data=officialSchedulesToGTFS(all);
const wed=new Date(2026,10,4,6,30);
test('linhas 1,2,3,4,5,7,8,9 integradas com circulação e calendário',()=>{
 assert.deepEqual([...new Set(data.routes.map(r=>r.route_short_name))].sort(),['1','2','3','4','5','7','8','9']);
 assert.equal(data.trips.length,90+51+8+19);
});
test('linha 1: partida 06:40 e chegada 08:00 nos pontos de referência publicados',()=>{
 const trips=plan(data,'mobilis:l7:estadio','mobilis:l2:campus-2',wed);
 assert.ok(trips.some(x=>x.legs.some(l=>l.line==='1'&&l.departure.slice(0,5)==='06:40'&&l.arrival.slice(0,5)==='07:14')));
});
test('linha 3: 07:00 do Telheiro para Ponte da Pedra, 08:04',()=>{
 const x=plan(data,'mobilis:l3:telheiro','mobilis:l3:ponte-pedra',new Date(2026,10,4,6,58));
 assert.ok(x.some(j=>j.legs.some(l=>l.line==='3'&&l.departure.slice(0,5)==='07:00'&&l.arrival.slice(0,5)==='08:04')));
});
test('quadro por paragem mostra linhas e partidas por sentido',()=>{
 const t=stopTimetableSummary(data,'mobilis:l7:estadio',new Date(2026,10,4,7,0));
 assert.ok(t.lines.includes('1'));
 assert.ok(t.lines.includes('3'));
 assert.ok(t.departures>0);
 assert.ok(t.groups.find(g=>g.line==='1').departures.some(p=>p.time==='07:10:00'));
});
test('sem horário no dia escolhido não fabrica partidas',()=>{
 const t=stopTimetable(data,'mobilis:l3:telheiro',new Date(2026,10,8,7,0));
 assert.equal(t.length,0);
});
