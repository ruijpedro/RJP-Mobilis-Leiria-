import {canonicalStopName} from './stopMatching.js';
import {seconds,formatGTFSSeconds} from './gtfs.js';
import {buildOsmPositionIndex,routeDistanceFractions} from './geoStopProgress.js';

// Estima exclusivamente ENTRE duas passagens publicadas da mesma circulação.
// Uma sequência parcial permite interpolar apenas os troços cobertos por duas
// referências consecutivas; nunca prolongar viagens nem inventar sentidos.
function sameReference(publishedName,officialName,line,index){
 const published=canonicalStopName(publishedName).replace(/\bsto\b/g,'santo');
 const official=canonicalStopName(officialName).replace(/\bsto\b/g,'santo').replace(/^campus 2 ulo$/,'campus 2 ipl');
 if(published===official)return true;
 if(official==='vale sepal'&&published.includes('rua vale sepal'))return true;
 if(official==='hospital santo andre 1 visitas'&&published==='hospital visitas')return true;
 // Correspondências restritas a um índice do percurso: não promovem a
 // plataforma real a validada; apenas permitem interpolar entre âncoras.
 if(line==='7'&&official==='r das olhalvas hospital santo andre ida'&&
    published==='rua das olhalvas hospital santo andre'&&index===7)return true;
 if(line==='7'&&official==='r das olhalvas hospital santo andre regresso'&&
    published==='rua das olhalvas hospital santo andre'&&index===29)return true;
 // "ZICOFA" é uma referência genérica do horário. A primeira paragem
 // ZICOFA do trajeto serve apenas de referência aproximada para o cálculo.
 if(line==='5'&&official==='zicofa'&&published==='zicofa 1'&&index===23)return true;
 return false;
}
export function interpolatePublishedStops(data,published,{osmStops=[]}={}){
 if(!data?.trips?.length||!published?.routes||data.estimatedStopTimes!==undefined)return data;
 const osmPositions=buildOsmPositionIndex(osmStops);
 const byTrip=new Map();
 for(const st of data.stopTimes||[]){
  if(!byTrip.has(st.trip_id))byTrip.set(st.trip_id,[]);
  byTrip.get(st.trip_id).push(st);
 }
 const stopIndex=new Map((data.stops||[]).map(s=>[s.stop_id,s]));
 const routeIndex=new Map((data.routes||[]).map(r=>[r.route_id,String(r.route_short_name)]));
 const addedStops=new Map(),rebuilt=[];
 for(const trip of data.trips){
  const original=(byTrip.get(trip.trip_id)||[]).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
  const line=routeIndex.get(trip.route_id);
  const route=trip.route_id.startsWith('mobilis-official-')?published.routes[line]:null;
  if(!route?.stops?.length||original.length<2){rebuilt.push(...original);continue;}
  // Identificar paragens-âncora por nome e ordem, sem assumir plataformas.
  const indices=[];let previous=-1;
  for(const item of original){
   const stop=stopIndex.get(item.stop_id);
   const index=stop?route.stops.findIndex((name,i)=>i>previous&&sameReference(name,stop.stop_name,line,i)):-1;
   indices.push(index);
   if(index>=0)previous=index;
  }
  // Exigir correspondência integral quando a sequência é dita completa.
  // Em excertos, nunca interpolar através de uma âncora não encontrada.
  if(route.completePublishedSequence&&indices.some(index=>index<0)){
   rebuilt.push(...original);continue;
  }
  const pairs=[];
  for(let i=0;i<original.length;i++){
   pairs.push({order:i,stopTime:original[i]});
   if(i===original.length-1)continue;
   const start=indices[i],end=indices[i+1];
   if(start<0||end<0||end<=start+1)continue;
   const t0=seconds(original[i].departure_time),t1=seconds(original[i+1].arrival_time);
   if(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<=t0||t1-t0>90*60)continue;
   const fractions=routeDistanceFractions(route.stops,osmPositions,start,end);
   for(let k=start+1;k<end;k++){
    const ratio=fractions?fractions[k-start]:(k-start)/(end-start);
    const time=Math.round((t0+(t1-t0)*ratio)/60)*60;
    const id='mobilis:interpolated:'+line+':'+k;
    if(!stopIndex.has(id)&&!addedStops.has(id))addedStops.set(id,{
      stop_id:id,stop_name:route.stops[k],stop_lat:'',stop_lon:'',interpolatedStop:true
    });
    pairs.push({order:i+(k-start)/(end-start),stopTime:{
      trip_id:trip.trip_id,stop_id:id,
      arrival_time:formatGTFSSeconds(time),departure_time:formatGTFSSeconds(time),
      timeIsEstimated:true,estimateMethod:fractions?'geographical-distance':'linear-stop-order',
      estimateConfidence:fractions?'geographic-approximation':'sequence-only',
      estimateFrom:original[i].stop_id,estimateTo:original[i+1].stop_id
    }});
   }
  }
  pairs.sort((a,b)=>a.order-b.order);
  rebuilt.push(...pairs.map((item,i)=>({...item.stopTime,stop_sequence:String(i+1)})));
 }
 return {...data,stops:[...(data.stops||[]),...addedStops.values()],stopTimes:rebuilt,
   estimatedStopTimes:rebuilt.filter(st=>st.timeIsEstimated).length};
}
