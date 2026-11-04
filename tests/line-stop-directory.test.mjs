import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directoryStopList,directoryLinesAtStop,directoryCoverage} from '../src/lineStopDirectory.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/line-stop-directory.json',import.meta.url),'utf8'));

test('catálogo contém as nove linhas e 298 posições ordenadas sem inventar horários',()=>{
 assert.deepEqual(Object.keys(catalog.routes).sort(),['1','2','3','4','5','6','7','8','9']);
 assert.equal(Object.values(catalog.routes).reduce((n,l)=>n+l.stops.length,0),298);
 const entries=directoryStopList(catalog);
 assert.equal(entries.length,147);
 assert.ok(entries.every(x=>x.hasPublishedTimetable===false));
});
test('paragem com duas linhas mantém ambas e o histórico de sentidos por rever',()=>{
 const lines=directoryLinesAtStop(catalog,'Vidigal de Baixo: Rua 29 Junho');
 assert.deepEqual(lines,['7','8']);
 const campus=directoryLinesAtStop(catalog,'Campus 2 IPL');
 assert.deepEqual(campus,['1','2','9']);
});
test('paragens repetidas no mesmo circuito não se contam como plataformas novas',()=>{
 const stops=directoryStopList(catalog);
 const terminal=stops.find(s=>s.stop_name==='Av. Bernardo Pimenta (Terminal)');
 assert.ok(terminal);
 assert.ok(terminal.sequenceByLine['2'].length>1);
 assert.ok(terminal.lines.includes('6'));
});
test('cobertura de horários não aumenta artificialmente por importar catálogo',()=>{
 const empty=directoryCoverage(catalog,{stops:[],stopTimes:[]});
 assert.equal(empty.withTimedReference,0);
 assert.ok(empty.withoutTimedReference>0);
 const some=directoryCoverage(catalog,{stops:[{stop_id:'a',stop_name:'Campus 2 IPL'}],stopTimes:[{stop_id:'a',trip_id:'t'}]});
 assert.equal(some.withTimedReference,1);
});
