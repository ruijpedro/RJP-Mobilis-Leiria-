import {activeService,seconds} from './gtfs.js';

/** Partidas documentadas por paragem, agrupadas por linha e sentido.
 * Nunca cria horários para paragens OSM sem dados GTFS.
 */
export function stopTimetable(data,stopId,date=new Date()){
 if(!data?.trips||!data?.stopTimes||!stopId)return [];
 const trips=new Map(data.trips.map(t=>[t.trip_id,t]));
 const routes=new Map((data.routes||[]).map(r=>[r.route_id,r]));
 const byLine=new Map();
 const dateCalendar=data.calendar||[],exceptions=data.calendarDates||[];
 for(const st of data.stopTimes){
  if(st.stop_id!==stopId)continue;
  const trip=trips.get(st.trip_id);
  if(!trip||!activeService(trip.service_id,date,dateCalendar,exceptions))continue;
  const time=st.departure_time;
  if(!Number.isFinite(seconds(time)))continue;
  const route=routes.get(trip.route_id);
  if(!route)continue;
  const line=String(route.route_short_name||route.route_long_name||route.route_id);
  const direction=String(trip.trip_headsign||route.route_long_name||'Sentido não indicado');
  const key=line+'\u0000'+direction;
  const bucket=byLine.get(key)||{line,direction,departures:[],sources:new Set()};
  bucket.departures.push({time,tripId:trip.trip_id,sourceUrl:trip.sourceUrl||null,estimated:!!st.timeIsEstimated});
  if(trip.sourceUrl)bucket.sources.add(trip.sourceUrl);
  byLine.set(key,bucket);
 }
 return [...byLine.values()].map(x=>({
   line:x.line,direction:x.direction,
   departures:x.departures.sort((a,b)=>seconds(a.time)-seconds(b.time)||a.tripId.localeCompare(b.tripId)),
   sources:[...x.sources]
 })).sort((a,b)=>a.line.localeCompare(b.line,'pt',{numeric:true})||a.direction.localeCompare(b.direction,'pt'));
}
export function stopTimetableSummary(data,stopId,date=new Date()){
 const groups=stopTimetable(data,stopId,date);
 return {lines:[...new Set(groups.map(g=>g.line))],departures:groups.reduce((n,g)=>n+g.departures.length,0),groups};
}
