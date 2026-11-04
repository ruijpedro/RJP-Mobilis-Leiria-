import {canonicalStopName} from './stopMatching.js';

// Desenho esquemático. Não representa as ruas nem caminhos para atravessar.
// Só usa coordenadas atribuídas à paragem ou um único candidato OSM por nome.
export function findJourneyStopCoordinates(stop,osmStops=[]){
 if(!stop)return null;
 const valid=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
 if(valid(stop.stop_lat)&&valid(stop.stop_lon)){
  const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);
  if(lat>=39&&lat<=41&&lon>=-9.5&&lon<=-7.5)return [lat,lon];
 }
 const name=canonicalStopName(stop.stop_name);
 if(!name||name==='paragem sem nome')return null;
 const matches=osmStops.filter(s=>canonicalStopName(s.stop_name)===name&&valid(s.stop_lat)&&valid(s.stop_lon));
 if(matches.length!==1)return null;
 return [Number(matches[0].stop_lat),Number(matches[0].stop_lon)];
}
export function journeyLegPaths(journey,data,osmStops=[]){
 if(!journey?.legs?.length||!data)return [];
 const stops=new Map((data.stops||[]).map(s=>[s.stop_id,s]));
 const tripTimes=new Map();
 for(const st of data.stopTimes||[]){
  const rows=tripTimes.get(st.trip_id)||[];rows.push(st);tripTimes.set(st.trip_id,rows);
 }
 return journey.legs.map((leg,i)=>{
  const rows=(tripTimes.get(leg.tripId)||[]).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
  const from=rows.findIndex(s=>s.stop_id===leg.from);
  const to=rows.findIndex((s,j)=>j>from&&s.stop_id===leg.to);
  const selected=from>=0&&to>from?rows.slice(from,to+1):[
   {stop_id:leg.from},{stop_id:leg.to}
  ];
  const points=selected.map(s=>({
   id:s.stop_id,name:stops.get(s.stop_id)?.stop_name||s.stop_id,
   coordinates:findJourneyStopCoordinates(stops.get(s.stop_id),osmStops),
   estimated:!!s.timeIsEstimated
  })).filter(s=>s.coordinates);
  return {legIndex:i,line:leg.line,estimated:!!leg.estimated,
   departure:leg.departure,arrival:leg.arrival,
   points,coordinates:points.map(p=>p.coordinates),
   drawnStops:points.length,totalStops:selected.length,
   fullyMapped:points.length===selected.length&&selected.length>1};
 });
}
