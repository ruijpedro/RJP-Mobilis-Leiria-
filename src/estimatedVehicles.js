import {matchVehiclePath,pointOnVehiclePath} from './vehicleGeometry.js';
import {activeService,seconds} from './gtfs.js';
import {findJourneyStopCoordinates} from './mapJourney.js';

// Scheduled estimates only; never GPS. No external API.
export function buildEstimatedVehicleIndex(data,osmStops=[],osmRoutes=[]){
 const stops=new Map((data?.stops||[]).map(s=>[s.stop_id,s]));
 const routes=new Map((data?.routes||[]).map(r=>[r.route_id,r]));
 const coords=new Map([...stops].map(([id,s])=>[id,findJourneyStopCoordinates(s,osmStops)]));
 const grouped=new Map();
 for(const st of data?.stopTimes||[]){
  const list=grouped.get(st.trip_id)||[];list.push(st);grouped.set(st.trip_id,list);
 }
 return (data?.trips||[]).map(trip=>({trip,route:routes.get(trip.route_id),
  rows:(grouped.get(trip.trip_id)||[]).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence)).map(s=>({
   ...s,name:stops.get(s.stop_id)?.stop_name||s.stop_id,point:coords.get(s.stop_id),
   arrival:seconds(s.arrival_time),departure:seconds(s.departure_time)
  }))})).filter(x=>x.rows.length>=2).map(x=>({...x,rows:x.rows.map((row,i)=>({...row,path:matchVehiclePath(row.point,x.rows[i+1]?.point,x.route?.route_short_name,osmRoutes)}))}));
}
export function estimatedVehicles(index,data,now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const day=new Date(+parts.year,+parts.month-1,+parts.day,12);
 const clock=+parts.hour*3600 + +parts.minute*60 + +parts.second;
 const result=[];
 for(const offset of [0,1]){
  const serviceDay=new Date(day);serviceDay.setDate(day.getDate()-offset);
  const t=clock+offset*86400;
  for(const {trip,route,rows} of index){
   if(!activeService(trip.service_id,serviceDay,data.calendar||[],data.calendarDates||[]))continue;
   for(let i=0;i<rows.length-1;i++){
    const a=rows[i],b=rows[i+1];
    if(!Number.isFinite(a.arrival)||!Number.isFinite(a.departure)||!Number.isFinite(b.arrival)||a.arrival>a.departure||b.arrival<a.departure||t<a.arrival||t>=b.arrival)continue;
    const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=39&&p[0]<=41&&p[1]>=-9.5&&p[1]<=-7.5;
    if(!valid(a.point)||!valid(b.point))break;
    const f=t<=a.departure?0:(t-a.departure)/(b.arrival-a.departure);
    const point=pointOnVehiclePath(a.path,f)||[a.point[0]+f*(b.point[0]-a.point[0]),a.point[1]+f*(b.point[1]-a.point[1])];
    result.push({id:trip.trip_id+':'+serviceDay.toDateString(),tripId:trip.trip_id,
     line:route?.route_short_name||'?',routeId:trip.route_id,headsign:trip.trip_headsign||route?.route_long_name||'',
     lat:point[0],lon:point[1],
     nextStop:b.name,nextArrival:b.arrival_time,etaMinutes:Math.ceil((b.arrival-t)/60),
     positionSource:'scheduled',geometry:a.path?'osm-approximation':'straight-line',estimated:true});
    break;
   }
  }
 }
 return result;
}
