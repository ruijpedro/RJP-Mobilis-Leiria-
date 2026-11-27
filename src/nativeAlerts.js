import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {activeService,seconds} from './gtfs.js';
import {lisbonServiceClock,serviceDateKey} from './scheduledAlerts.js';
const tag='mobilis-timetable';
export const nativeAlertsAvailable=()=>Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('LocalNotifications');
function instant(day,sec){
 const utc=Date.UTC(day.getFullYear(),day.getMonth(),day.getDate())+sec*1000;
 let ms=utc;
 for(let i=0;i<3;i++){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
 ms+=utc-wall;
 }
 return new Date(ms);
}
export function planNativeAlerts(alerts,data,now=new Date()){
 const result=[];const {serviceDate}=lisbonServiceClock(now);
 const trips=new Map((data?.trips||[]).map(t=>[String(t.trip_id),t]));
 const rows=new Map((data?.stopTimes||[]).map(t=>[String(t.trip_id)+'|'+String(t.stop_sequence),t]));
 for(const a of alerts){
 if(!a.enabled)continue;
 const trip=trips.get(String(a.tripId)),row=rows.get(String(a.tripId)+'|'+String(a.sequence));
 if(!trip||!row)continue;
 const sec=seconds(row.arrival_time||row.departure_time),lead=Number(a.lead);
 if(!Number.isFinite(sec)||![1,5,10,15].includes(lead))continue;
 for(let i=-1;i<30;i++){
 const day=new Date(serviceDate);day.setDate(day.getDate()+i);
 const date=serviceDateKey(day);
 if(a.mode==='once'?a.date!==date:!(a.days||[]).includes(day.getDay()))continue;
 if(!activeService(trip.service_id,day,data.calendar||[],data.calendarDates||[]))continue;
 const at=instant(day,sec-lead*60);
 if(at<=now)continue;
 result.push({title:'Mobilis · Linha '+a.line,body:a.name+' — chegada prevista dentro de '+lead+' min.',schedule:{at},extra:{tag,key:a.id+':'+date}});
 }
 }
 return result.sort((a,b)=>a.schedule.at-b.schedule.at).slice(0,60).map((n,i)=>({...n,id:1700000000+i}));
}
let queue=Promise.resolve();
export function syncNativeAlerts(alerts,data,request=false){
 const run=async()=>{
 if(!nativeAlertsAvailable())return 'Notificações nativas indisponíveis nesta versão.';
 let p=await LocalNotifications.checkPermissions();
 if(request&&p.display!=='granted')p=await LocalNotifications.requestPermissions();
 if(p.display!=='granted')return 'Autoriza as notificações Android.';
 const pending=await LocalNotifications.getPending();
 const old=pending.notifications.filter(n=>n.extra?.tag===tag||(n.id>=1700000000&&n.id<1700000060));
 if(old.length)await LocalNotifications.cancel({notifications:old.map(n=>({id:n.id}))});
 const notifications=planNativeAlerts(alerts,data);
 if(notifications.length)await LocalNotifications.schedule({notifications});
 return notifications.length+' avisos programados (até 30 dias; precisão sujeita ao Android).';
 };
 const next=queue.catch(()=>{}).then(run);queue=next;return next;
}
