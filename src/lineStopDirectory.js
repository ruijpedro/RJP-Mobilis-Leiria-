import {canonicalStopName} from './stopMatching.js';

// Catálogo de descoberta: nomes de paragens em percursos publicados.
// NÃO valida a plataforma, o sentido nem cria horas de passagem.
export function directoryStopList(catalog){
 const byName=new Map();
 for(const [line,route] of Object.entries(catalog?.routes||{})){
  for(const [sequence,name] of (route.stops||[]).entries()){
   const key=canonicalStopName(name);
   if(!key)continue;
   if(!byName.has(key))byName.set(key,{
    stop_id:'catalog:'+key,stop_name:name,
    lines:[],sources:[],sequenceByLine:{},hasPublishedTimetable:false
   });
   const item=byName.get(key);
   if(!item.lines.includes(line))item.lines.push(line);
   if(route.source&&!item.sources.includes(route.source))item.sources.push(route.source);
   (item.sequenceByLine[line]??=[]).push(sequence);
  }
 }
 return [...byName.values()].map(s=>({...s,lines:s.lines.sort((a,b)=>Number(a)-Number(b))}))
  .sort((a,b)=>a.stop_name.localeCompare(b.stop_name,'pt'));
}
export function directoryLinesAtStop(catalog,name){
 const key=canonicalStopName(name);
 if(!key||key==='paragem sem nome')return [];
 return directoryStopList(catalog).find(s=>canonicalStopName(s.stop_name)===key)?.lines||[];
}
export function directoryCoverage(catalog,data){
 const entries=directoryStopList(catalog);
 const stopTimes=new Set((data?.stopTimes||[]).map(s=>s.stop_id));
 const normalizedTimed=new Set((data?.stops||[])
  .filter(s=>stopTimes.has(s.stop_id)).map(s=>canonicalStopName(s.stop_name)));
 const withTimedReference=entries.filter(x=>normalizedTimed.has(canonicalStopName(x.stop_name))).length;
 return {uniqueStops:entries.length,withTimedReference,withoutTimedReference:entries.length-withTimedReference,
  lineCount:Object.keys(catalog?.routes||{}).length};
}
