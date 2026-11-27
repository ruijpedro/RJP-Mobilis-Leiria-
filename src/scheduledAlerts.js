import {activeService,seconds} from './gtfs.js';

// All calculations use the service clock in mainland Portugal. A GTFS trip may
// serve stops after midnight with a 24:xx / 25:xx arrival time.
export function lisbonServiceClock(now=new Date()){
 const values=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
  timeZone:'Europe/Lisbon',year:'numeric',month:'numeric',day:'numeric',
  hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'
 }).formatToParts(now).map(p=>[p.type,p.value]));
 const y=Number(values.year),m=Number(values.month),d=Number(values.day);
 return {serviceDate:new Date(y,m-1,d,12),seconds:Number(values.hour)*3600+Number(values.minute)*60+Number(values.second)};
}
export function serviceDateKey(day){
 return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
}
export function evaluateScheduledAlerts(alerts,data,now=new Date()){
 if(!Array.isArray(alerts)||!data?.trips?.length||!data?.stopTimes?.length)return [];
 const {serviceDate,seconds:clock}=lisbonServiceClock(now);
 const trips=new Map(data.trips.map(t=>[String(t.trip_id),t]));
 const stopRows=new Map();
 for(const row of data.stopTimes){
  const key=String(row.trip_id)+'|'+String(row.stop_sequence);
  if(!stopRows.has(key))stopRows.set(key,row);
 }
 const results=[];
 for(const alert of alerts){
  if(!alert?.enabled||!alert.tripId||alert.sequence==null)continue;
  const lead=Math.max(0,Math.min(60,Number(alert.lead)||0));
  if(!lead)continue;
  const trip=trips.get(String(alert.tripId));
  const row=stopRows.get(String(alert.tripId)+'|'+String(alert.sequence));
  if(!trip||!row)continue;
  const arrival=seconds(row.arrival_time||row.departure_time);
  if(!Number.isFinite(arrival))continue;
  for(const offset of [0,1]){
   const day=new Date(serviceDate);
   day.setDate(day.getDate()-offset);
   const iso=serviceDateKey(day);
   if(alert.mode==='once'){
    if(alert.date!==iso)continue;
   }else if(!Array.isArray(alert.days)||!alert.days.includes(day.getDay()))continue;
   if(!activeService(trip.service_id,day,data.calendar||[],data.calendarDates||[]))continue;
   const remaining=arrival-(clock+offset*86400);
   if(remaining<0||remaining>lead*60)continue;
   results.push({
    key:String(alert.id)+':'+iso+':'+String(trip.trip_id)+':'+String(alert.sequence),
    id:alert.id,line:alert.line||'?',name:alert.name||row.stop_id,
    minutes:Math.ceil(remaining/60),scheduledTime:row.arrival_time||row.departure_time,
    estimated:!!row.timeIsEstimated,serviceDate:iso
   });
   break;
  }
 }
 return results;
}
