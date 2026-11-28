import {matchVehiclePath,pointOnVehiclePath} from './vehicleGeometry.js';
import {activeService,seconds} from './gtfs.js';
import {findJourneyStopCoordinates} from './mapJourney.js';

// Scheduled estimates only; never GPS. No external API.
export function buildEstimatedVehicleIndex(data,osmStops=[],osmRoutes=[]){
 const stops=new Map((data?.stops||[]).map(s=>[s.stop_id,s]));
 const routes=new Map((data?.routes||[]).map(r=>[r.route_id,r]));
 const coords=new Map([...stops].map(([id,s])=>[id,findJourneyStopCoordinates(s,osmStops)]));
 const shapes=new Map();
 for(const p of data?.shapes||[]){
  if(!p.shape_id||!String(p.shape_pt_lat??'').trim()||!String(p.shape_pt_lon??'').trim())continue;
  const lat=Number(p.shape_pt_lat),lon=Number(p.shape_pt_lon),seq=Number(p.shape_pt_sequence);
  if(!Number.isFinite(seq)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const list=shapes.get(p.shape_id)||[];list.push({seq,point:[lat,lon]});shapes.set(p.shape_id,list);
 }
 for(const [id,list] of shapes)shapes.set(id,list.sort((a,b)=>a.seq-b.seq).map(p=>p.point));
 const grouped=new Map();
 for(const st of data?.stopTimes||[]){
  const list=grouped.get(st.trip_id)||[];list.push(st);grouped.set(st.trip_id,list);
 }
 return (data?.trips||[]).map(trip=>({trip,route:routes.get(trip.route_id),
  rows:(grouped.get(trip.trip_id)||[]).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence)).map(s=>({
   ...s,name:stops.get(s.stop_id)?.stop_name||s.stop_id,point:coords.get(s.stop_id),
   arrival:seconds(s.arrival_time),departure:seconds(s.departure_time)
  }))})).filter(x=>x.rows.length>=2).map(x=>({...x,rows:x.rows.map((row,i)=>({...row,...(()=>{const line=x.route?.route_short_name;const shape=shapes.get(x.trip.shape_id);const official=shape?matchVehiclePath(row.point,x.rows[i+1]?.point,line,[{ref:line,shape_segments:[shape]}]):null;const bridgePaths=Object.create(null);for(let j=i+2;j<Math.min(x.rows.length,i+11);j++){const target=x.rows[j];const p=(shape?matchVehiclePath(row.point,target.point,line,[{ref:line,shape_segments:[shape]}]):null)||matchVehiclePath(row.point,target.point,line,osmRoutes);if(p)bridgePaths[target.stop_id]=p;}return {path:official||matchVehiclePath(row.point,x.rows[i+1]?.point,line,osmRoutes),officialPath:!!official,bridgePaths};})()}))}));
}
export function estimatedVehicles(index,data,now=new Date(),diagnostic=null){
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
    if(diagnostic){const key=route?.route_short_name||'?';diagnostic[key]??={scheduled:0,mapped:0};diagnostic[key].scheduled++;}
    let left=i,right=i+1;
    while(left>=0&&!valid(rows[left].point))left--;
    while(right<rows.length&&!valid(rows[right].point))right++;
    if(left<0||right>=rows.length)break;
    const start=rows[left],end=rows[right],gap=left!==i||right!==i+1;
    if(gap&&(!Number.isFinite(start.departure)||!Number.isFinite(end.arrival)||end.arrival<=start.departure||end.arrival-start.departure>1800||right-left>10))break;
    if(diagnostic)diagnostic[route?.route_short_name||'?'].mapped++;
    const f=t<=a.departure?0:(t-a.departure)/(b.arrival-a.departure);
    const ratio=gap?Math.max(0,Math.min(1,(t-start.departure)/(end.arrival-start.departure))):f;
    const bridge=gap?start.bridgePaths?.[end.stop_id]:null;
    const point=pointOnVehiclePath(gap?bridge:a.path,ratio)||[start.point[0]+ratio*(end.point[0]-start.point[0]),start.point[1]+ratio*(end.point[1]-start.point[1])];
    result.push({id:trip.trip_id+':'+serviceDay.toDateString(),tripId:trip.trip_id,
     line:route?.route_short_name||'?',routeId:trip.route_id,headsign:trip.trip_headsign||route?.route_long_name||'',
     lat:point[0],lon:point[1],
     nextStop:b.name,nextArrival:b.arrival_time,etaMinutes:Math.ceil((b.arrival-t)/60),
     nextIndex:i+1,totalStops:rows.length,finalArrival:rows.at(-1).arrival_time,previousStops:rows.slice(0,i+1).map(r=>({sequence:r.stop_sequence,name:r.name,time:String(r.arrival_time||'').slice(0,5)})),progress:Math.round(100*(i+f)/(rows.length-1)),remainingStops:rows.slice(i+1).filter(r=>Number.isFinite(r.arrival)&&r.arrival>=t).map(r=>({sequence:r.stop_sequence,name:r.name,time:r.arrival_time.slice(0,5),minutes:Math.ceil((r.arrival-t)/60)})),
     positionSource:'scheduled',geometry:gap?(bridge?'anchor-route-approximation':'anchor-approximation'):a.officialPath?'gtfs-shape':a.path?'osm-approximation':'straight-line',estimated:true});
    break;
   }
  }
 }
 return result;
}
