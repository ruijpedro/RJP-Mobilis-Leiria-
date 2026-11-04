import {canonicalStopName} from './stopMatching.js';
import {seconds,formatGTFSSeconds} from './gtfs.js';

// Estima passagens apenas entre DUAS horas de referência da mesma viagem.
// É uma aproximação linear por ordem de paragens, não um horário publicado.
// Não extrapola antes/depois das referências nem usa sequências incompletas.
function sameReference(publishedName,officialName){
 const published=canonicalStopName(publishedName).replace(/\\bsto\\b/g,'santo');
 const official=canonicalStopName(officialName).replace(/\\bsto\\b/g,'santo');
 if(published===official)return true;
 // Nome abreviado do mesmo lugar, explicitamente identificado no percurso.
 return official==='vale sepal'&&published.includes('rua vale sepal');
}
export function interpolatePublishedStops(data,published){
 if(!data?.trips?.length||!published?.routes||data.estimatedStopTimes!==undefined)return data;
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
  const route=trip.route_id.startsWith('mobilis-official-')?published.routes[routeIndex.get(trip.route_id)]:null;
  // Sem sequência completa ou pontos suficientes, não há estimativa.
  if(!route?.completePublishedSequence||!Array.isArray(route.stops)||original.length<2){
   rebuilt.push(...original);continue;
  }
  const anchors=[];
  let previous=-1;
  for(const stopTime of original){
   const stop=stopIndex.get(stopTime.stop_id);
   if(!stop){anchors.length=0;break;}
   const next=names.findIndex((name,i)=>i>previous&&sameReference(route.stops[i],stop.stop_name));
   if(next<0){anchors.length=0;break;}
   const time=seconds(stopTime.departure_time);
   if(!Number.isFinite(time)){anchors.length=0;break;}
   anchors.push({index:next,time,stopTime});
   previous=next;
  }
  if(anchors.length<2){rebuilt.push(...original);continue;}
  const items=original.map((st,i)=>({...st,stop_sequence:String(anchors[i].index+1)}));
  for(let i=0;i<anchors.length-1;i++){
   const a=anchors[i],b=anchors[i+1];
   const gap=b.index-a.index,elapsed=b.time-a.time;
   if(gap<=1||elapsed<=0||elapsed>90*60)continue;
   for(let j=a.index+1;j<b.index;j++){
    const estimatedSeconds=Math.round((a.time+(elapsed*(j-a.index)/gap))/60)*60;
    const name=route.stops[j],id='mobilis:interpolated:'+routeIndex.get(trip.route_id)+':'+j;
    if(!addedStops.has(id)&&!stopIndex.has(id))addedStops.set(id,{
      stop_id:id,stop_name:name,stop_lat:'',stop_lon:'',interpolatedStop:true
    });
    items.push({trip_id:trip.trip_id,stop_id:id,
      stop_sequence:String(j+1),arrival_time:formatGTFSSeconds(estimatedSeconds),
      departure_time:formatGTFSSeconds(estimatedSeconds),timeIsEstimated:true,
      estimateMethod:'linear-stop-order',estimateFrom:a.stopTime.stop_id,estimateTo:b.stopTime.stop_id});
   }
  }
  rebuilt.push(...items.sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence)));
 }
 return {...data,stops:[...(data.stops||[]),...addedStops.values()],stopTimes:rebuilt,
  estimatedStopTimes:rebuilt.filter(st=>st.timeIsEstimated).length};
}
