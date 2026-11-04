import {canonicalStopName} from './stopMatching.js';
import {plan,searchStops,normalise} from './gtfs.js';

// Pesquisa segura: apenas itinerários presentes nos horários disponíveis.
// As sugestões permitem nomes parciais, mas nunca criam paragens ou horários fictícios.
export function resolveStopCandidates(stops,text,selectedId='',limit=7){
  if(selectedId) return stops.filter(s=>s.stop_id===selectedId);
  const q=normalise(text);
  if(!q||q.length<2) return [];
  const cq=canonicalStopName(text);
  const direct=searchStops(stops,text,18);
  const alias=stops.filter(s=>canonicalStopName(s.stop_name).includes(cq));
  const candidates=[...new Map([...direct,...alias].map(s=>[s.stop_id,s])).values()];
  return candidates.sort((a,b)=>{
    const aa=canonicalStopName(a.stop_name),bb=canonicalStopName(b.stop_name);
    const score=x=>x===cq?0:x.startsWith(cq)?1:x.includes(cq)?2:3;
    return score(aa)-score(bb)||aa.localeCompare(bb,'pt');
  }).slice(0,limit);
}
export function findJourneyOptions(data,origin,destination,date,{fromId='',toId='',delays={},maxTransfers=2}={}){
 if(!data?.stops?.length)return {routes:[],origins:[],destinations:[],reason:'Ainda não existem dados de horários.'};
 const origins=resolveStopCandidates(data.stops,origin,fromId);
 const destinations=resolveStopCandidates(data.stops,destination,toId);
 if(!origins.length||!destinations.length)return {routes:[],origins,destinations,reason:'Não foram encontradas paragens com horários para ambos os locais. Consulta o mapa ou importa um GTFS completo.'};
 const found=[];
 for(const from of origins)for(const to of destinations){
   if(from.stop_id===to.stop_id)continue;
   for(const journey of plan(data,from.stop_id,to.stop_id,date,maxTransfers,delays)){
     found.push({...journey,originStop:from,destinationStop:to});
   }
 }
 const unique=new Map();
 for(const r of found){
   const key=r.legs.map(l=>l.tripId+':'+l.from+':'+l.to).join('|');
   if(!unique.has(key))unique.set(key,r);
 }
 const routes=[...unique.values()].sort((a,b)=>{
   const arrival=a.time-b.time;
   return arrival||a.transfers-b.transfers||a.journeyMinutes-b.journeyMinutes;
 }).slice(0,32);
 return {routes,origins,destinations,reason:routes.length?'':'Não existem ligações confirmadas nestes horários. A base incluída é parcial; para outros autocarros é necessário um GTFS válido e completo.'};
}
