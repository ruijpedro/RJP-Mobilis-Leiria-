import test from 'node:test';
import assert from 'node:assert/strict';
import {officialSchedulesToGTFS,sharedOfficialStopIds} from '../src/officialSchedules.js';
import {plan} from '../src/gtfs.js';

const make=(line,id,stops)=>({
 line,id,direction:'Sentido '+line,days:'weekdays',
 validFrom:'20261101',validUntil:'20261231',
 source:'https://mobilis.pt/linhas/linha-'+line+'/',
 stops:stops.map(([stopId,stopName,time])=>({stopId,stopName,time}))
});
test('transbordo entre duas linhas que identificam a mesma paragem com IDs diferentes',()=>{
 const services=[
  make('2','l2-1',[['a','Hospital','08:00'],['l2:terminal','Av. Bernardo Pimenta (Terminal)','08:20']]),
  make('7','l7-1',[['l7:terminal','Av Bernardo Pimenta Terminal','08:25'],['b','Vidigal','08:45']])
 ];
 const data=officialSchedulesToGTFS({schemaVersion:1,services});
 assert.equal(data.stops.length,3);
 const options=plan(data,'a','b',new Date(2026,10,4,7,55));
 assert.equal(options.length,1);
 assert.deepEqual(options[0].legs.map(l=>l.line),['2','7']);
 assert.equal(options[0].waitingMinutes,5);
});
test('não junta IDs distintos que surgem com o mesmo nome na mesma circulação',()=>{
 const services=[
  make('2','l2-1',[['a','Terminal','08:00'],['b','Terminal','08:15'],['c','Hospital','08:30']]),
  make('7','l7-1',[['z','Terminal','08:20'],['d','Vidigal','08:40']])
 ];
 const aliases=sharedOfficialStopIds(services);
 assert.equal(aliases.has('a'),false);
 assert.equal(aliases.has('b'),false);
 assert.equal(aliases.has('z'),false);
 const data=officialSchedulesToGTFS({schemaVersion:1,services});
 assert.equal(plan(data,'a','d',new Date(2026,10,4,7,55)).length,0);
});
