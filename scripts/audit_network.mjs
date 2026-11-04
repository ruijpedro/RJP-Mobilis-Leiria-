#!/usr/bin/env node
// Auditoria reprodutível: não confunde catálogo de percursos com horários oficiais.
import {readFileSync} from 'node:fs';
import {canonicalStopName} from '../src/stopMatching.js';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';

const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const sourceFiles=[
 'official-verified-schedules.json','official-line1-2026.json',
 'official-line3-2026.json','official-line5-2026.json','official-line6-2026.json'];
const services=sourceFiles.flatMap(name=>read(name).services||[]);
const catalog=read('line-stop-directory.json');
const sequences=read('published-stop-sequences.json');
const failures=[],warnings=[];
const mins=value=>{
 if(!/^(?:[01][0-9]|2[0-9]):[0-5][0-9](?::[0-5][0-9])?$/.test(String(value)))return NaN;
 const [h,m]=value.split(':').map(Number);return h*60+m;
};
const ids=new Set();
for(const service of services){
 if(ids.has(service.id))failures.push('ID repetido: '+service.id);
 ids.add(service.id);
 if(!/^[1-9]$/.test(service.line))failures.push('Linha inválida: '+service.id);
 if(!service.source?.startsWith('https://mobilis.pt/'))failures.push('Fonte inválida: '+service.id);
 if(!['weekdays','saturday','sunday','daily'].includes(service.days))failures.push('Calendário inválido: '+service.id);
 if(!/^20\d{6}$/.test(service.validUntil)||service.validFrom>service.validUntil)failures.push('Vigência inválida: '+service.id);
 let previous=-1;
 for(const stop of service.stops){
  const min=mins(stop.time);
  if(!stop.stopId||!stop.stopName||!Number.isFinite(min)||min<previous)failures.push('Paragem/hora inválida: '+service.id);
  previous=min;
 }
}
const data=officialSchedulesToGTFS({schemaVersion:1,services});
const estimated=interpolatePublishedStops(data,sequences,{osmStops:read('osm-stops-leiria.json')});
const lines=[...new Set(services.map(s=>s.line))].sort();
const directoryNames=new Set(Object.values(catalog.routes).flatMap(r=>r.stops.map(canonicalStopName)));
const anchorNames=new Set(services.flatMap(s=>s.stops.map(x=>canonicalStopName(x.stopName))));
const shared=[...directoryNames].filter(n=>anchorNames.has(n)).length;
const stopIdsWithHours=new Set(estimated.stopTimes.map(x=>x.stop_id));
const timedNames=new Set(estimated.stops.filter(s=>stopIdsWithHours.has(s.stop_id)).map(s=>canonicalStopName(s.stop_name)));
const routableMatches=[...directoryNames].filter(n=>timedNames.has(n)).length;
const estimates=estimated.stopTimes.filter(x=>x.timeIsEstimated);
const geographicalEstimates=estimates.filter(x=>x.estimateMethod==='geographical-distance').length;
const sequentialEstimates=estimates.filter(x=>x.estimateMethod==='linear-stop-order').length;
const officialBefore=new Map(data.stopTimes.map(x=>[x.trip_id+'|'+x.stop_sequence,x.departure_time]));
const originalPerTrip=new Map();
for(const st of data.stopTimes){
 const a=originalPerTrip.get(st.trip_id)||[];
 a.push(st);originalPerTrip.set(st.trip_id,a);
}
for(const [tripId,orig] of originalPerTrip){
 const after=estimated.stopTimes.filter(x=>x.trip_id===tripId&&!x.timeIsEstimated);
 if(after.length!==orig.length||after.some((st,i)=>st.departure_time!==orig[i].departure_time)){
  failures.push('Alteração de hora oficial ao interpolar: '+tripId);
 }
}
// Verificar que cada estimativa está delimitada por horas reais na mesma viagem.
const enhancedByTrip=new Map();
for(const row of estimated.stopTimes){const items=enhancedByTrip.get(row.trip_id)||[];items.push(row);enhancedByTrip.set(row.trip_id,items);}
for(const [tripId,rows] of enhancedByTrip){
 const ordered=rows.sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
 for(let i=0;i<ordered.length;i++){
  const row=ordered[i];if(!row.timeIsEstimated)continue;
  let before=i-1,after=i+1;
  while(before>=0&&ordered[before].timeIsEstimated)before--;
  while(after<ordered.length&&ordered[after].timeIsEstimated)after++;
  if(before<0||after>=ordered.length||
    mins(ordered[before].departure_time)>mins(row.departure_time)||
    mins(row.departure_time)>mins(ordered[after].arrival_time))
   failures.push('Estimativa fora de duas referências oficiais: '+tripId+' / '+row.stop_id);
 }
}
for(const line of lines){
 const list=services.filter(s=>s.line===line);
 const days=new Set(list.map(x=>x.days));
 if(!days.has('sunday')&&!days.has('daily'))warnings.push('Linha '+line+': sem circulações de domingo digitalizadas; oferta real não comprovada');
}
if([...new Set(services.map(x=>x.validUntil))].some(x=>x<='20261231'))
 warnings.push('A validade técnica dos horários termina em 2026-12-31 para pelo menos uma circulação');
if(routableMatches<directoryNames.size)warnings.push('Nem todos os nomes do catálogo possuem horas digitais, mesmo após interpolação. Não afirmar 100% da rede.');
if(Object.keys(catalog.routes).length!==9)failures.push('Catálogo não contém nove linhas');
if(lines.length!==9)failures.push('Horários não cobrem as nove linhas');
if(estimated.trips.length!==data.trips.length)failures.push('Interpolação alterou número de viagens');
const report={
 status:failures.length?'FAIL':'PASS_WITH_GAPS',
 lines:lines.length,trips:services.length,
 byLine:Object.fromEntries(lines.map(line=>[line,{
   trips:services.filter(x=>x.line===line).length,
   weekdays:services.filter(x=>x.line===line&&x.days==='weekdays').length,
   saturday:services.filter(x=>x.line===line&&x.days==='saturday').length,
   sunday:services.filter(x=>x.line===line&&x.days==='sunday').length,
 }])),
 publishedRoutePositions:Object.values(catalog.routes).reduce((n,x)=>n+x.stops.length,0),
 uniqueCatalogNames:directoryNames.size,officialReferenceNames:anchorNames.size,
 namesWithExactCanonicalMatch:shared,namesWithAnyDigitalTime:routableMatches,estimatedStopTimes:estimates.length,
 geographicalEstimates,sequentialEstimates,
 missingMatchingNames:directoryNames.size-shared,
 warnings,failures
};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
