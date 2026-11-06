import {canonicalStopName} from './stopMatching.js';
import {equivalentStopKeys} from './stopNameLookup.js';
import {stopTimetable} from './stopTimetable.js';
import {seconds} from './gtfs.js';

/**
 * Consulta exploratória por designação da paragem.
 * Nunca declara que uma passagem pertence à plataforma OSM selecionada.
 * Não cria horas novas; reutiliza apenas horários já presentes no GTFS,
 * incluindo interpolações explicitamente identificadas a montante.
 */
export function nameBasedStopTimetable(data,name,date=new Date()){
 const key=canonicalStopName(name);
 if(!data||!key||key==='paragem sem nome')return {lines:[],groups:[],departures:[],matchedStopIds:[]};
 const keys=new Set(equivalentStopKeys(name));
 const matched=(data.stops||[]).filter(s=>keys.has(canonicalStopName(s.stop_name)));
 const viaEquivalence=matched.some(s=>canonicalStopName(s.stop_name)!==key);
 const groups=new Map();
 for(const stop of matched){
  for(const group of stopTimetable(data,stop.stop_id,date)){
   const groupKey=group.line+'\u0000'+group.direction;
   if(!groups.has(groupKey))groups.set(groupKey,{line:group.line,direction:group.direction,departures:[],sources:new Set(),seen:new Set()});
   const item=groups.get(groupKey);
   for(const dep of group.departures){
    const uniq=dep.tripId+'\u0000'+dep.time;
    if(item.seen.has(uniq))continue;
    item.seen.add(uniq);item.departures.push(dep);
   }
   group.sources.forEach(url=>item.sources.add(url));
  }
 }
 const output=[...groups.values()].map(x=>({
  line:x.line,direction:x.direction,
  departures:x.departures.sort((a,b)=>seconds(a.time)-seconds(b.time)),
  sources:[...x.sources]
 })).sort((a,b)=>a.line.localeCompare(b.line,'pt',{numeric:true})||a.direction.localeCompare(b.direction,'pt'));
 const departures=output.flatMap(g=>g.departures.map(d=>({...d,line:g.line,direction:g.direction})))
  .sort((a,b)=>seconds(a.time)-seconds(b.time));
 return {lines:[...new Set(output.map(x=>x.line))],groups:output,departures,matchedStopIds:matched.map(s=>s.stop_id),viaEquivalence};
}
