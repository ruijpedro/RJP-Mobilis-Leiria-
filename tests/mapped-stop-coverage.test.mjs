import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditMappedStopCoverage} from '../src/mappedStopCoverage.js';
import {resolveMapStopForJourney} from '../src/resolveMapStopForJourney.js';
const read=f=>JSON.parse(readFileSync(new URL('../public/data/'+f,import.meta.url),'utf8'));
const osm=read('osm-stops-leiria.json'),catalog=read('line-stop-directory.json');
test('audita integralmente todas as paragens cartografadas sem inventar horários',()=>{
 const audit=auditMappedStopCoverage(osm,catalog);
 assert.equal(audit.summary.total,293);
 assert.equal(audit.rows.length,293);
 assert.equal(audit.summary.withLines+audit.summary.withoutDocumentedLines,293);
 assert.equal(audit.summary.withPublishedReference,0);
 assert.equal(audit.summary.withEstimatedReference,0);
 assert.ok(audit.summary.withLines>=185);
 assert.ok(audit.rows.every(row=>row.platformValidated===false));
});
test('separa horários publicados, interpolados e lacunas apenas por nome',()=>{
 const sample=[
 {stop_id:'osm:a',stop_name:'Porto Moniz / Esc. Francisco Rodrigues Lobo'},
 {stop_id:'osm:b',stop_name:'Bairro das Almoínhas'},
 {stop_id:'osm:c',stop_name:'Piscinas Municipais'}
 ];
 const data={
  stops:[{stop_id:'a',stop_name:'Porto Moniz / Esc. F. Rodrigues Lobo'},{stop_id:'b',stop_name:'Bairro das Almoínhas'}],
  stopTimes:[{trip_id:'x',stop_id:'a',departure_time:'08:00:00'},{trip_id:'y',stop_id:'b',departure_time:'08:07:00',timeIsEstimated:true}]
 };
 const report=auditMappedStopCoverage(sample,catalog,data);
 assert.equal(report.summary.withPublishedReference,1);
 assert.equal(report.summary.withEstimatedReference,1);
 assert.equal(report.summary.withoutDocumentedLines,1);
 assert.equal(report.rows[2].status,'sem-linha-documentada');
});
test('origem do mapa resolve nome equivalente se e só se ID horário for único',()=>{
 const selected={stop_id:'osm:a',stop_name:'Porto Moniz / Esc. Francisco Rodrigues Lobo'};
 const candidates=[{stop_id:'gtfs:1',stop_name:'Porto Moniz / Esc. F. Rodrigues Lobo'}];
 assert.deepEqual(resolveMapStopForJourney(selected,candidates),{stopId:'gtfs:1',kind:'reviewed-alias',matchedName:'Porto Moniz / Esc. F. Rodrigues Lobo'});
 const ambiguous=resolveMapStopForJourney(selected,[...candidates,{stop_id:'gtfs:2',stop_name:'Porto Moniz / Esc. F. Rodrigues Lobo'}]);
 assert.equal(ambiguous.stopId,'');
 assert.equal(ambiguous.kind,'ambiguous');
 assert.equal(resolveMapStopForJourney({stop_id:'osm:b',stop_name:'Piscinas Municipais'},candidates).kind,'unmatched');
});

test('linhas provenientes de serviços digitais são incluídas mesmo sem linha no catálogo',()=>{
 const sample=[{stop_id:'osm:p',stop_name:'Piscinas Municipais'}];
 const data={
  stops:[{stop_id:'digital:p',stop_name:'Piscinas Municipais'}],
  routes:[{route_id:'r',route_short_name:'7'}],
  trips:[{trip_id:'t',route_id:'r'}],
  stopTimes:[{stop_id:'digital:p',trip_id:'t',departure_time:'09:15:00'}]
 };
 const result=auditMappedStopCoverage(sample,catalog,data);
 assert.deepEqual(result.rows[0].lines,['7']);
 assert.equal(result.rows[0].published,1);
 assert.equal(result.rows[0].platformValidated,false);
});
