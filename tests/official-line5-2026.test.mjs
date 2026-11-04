import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {plan} from '../src/gtfs.js';
const raw=JSON.parse(readFileSync(new URL('../public/data/official-line5-2026.json',import.meta.url),'utf8'));
const data=officialSchedulesToGTFS(raw);
test('linha 5 inclui 11 dias úteis, 5 sábados e 3 domingos',()=>{
 assert.equal(data.trips.length,19);
 assert.equal(data.routes[0].route_short_name,'5');
 assert.equal(data.stopTimes.length,19*7);
});
test('linha 5 06:45 estádio a 07:35 estádio via Milagres',()=>{
 const journeys=plan(data,'mobilis:l5:estadio','mobilis:l5:milagres',new Date(2026,10,4,6,40));
 assert.ok(journeys.length);
 assert.equal(journeys[0].legs[0].departure.slice(0,5),'06:45');
 assert.equal(journeys[0].legs[0].arrival.slice(0,5),'07:09');
});
test('linha 5 sábado e domingo respeitam frequências oficiais',()=>{
 const sat=plan(data,'mobilis:l5:estadio','mobilis:l5:milagres',new Date(2026,10,7,7,55));
 assert.equal(sat[0].legs[0].departure.slice(0,5),'08:00');
 const sun=plan(data,'mobilis:l5:estadio','mobilis:l5:milagres',new Date(2026,10,8,8,55));
 assert.equal(sun[0].legs[0].departure.slice(0,5),'09:00');
});
