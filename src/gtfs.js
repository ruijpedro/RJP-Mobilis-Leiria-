import JSZip from 'jszip';
export function csvParse(source){const rows=[];let row=[],field='',quote=false;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quote&&source[i+1]==='"'){field+='"';i++}else quote=!quote}else if(c===','&&!quote){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=''}else field+=c}row.push(field);if(row.some(Boolean))rows.push(row);const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,''));return rows.map(r=>Object.fromEntries(headers.map((h,j)=>[h,r[j]??''])))}
export async function importGTFS(file){const zip=await JSZip.loadAsync(file);const read=async n=>{const f=Object.values(zip.files).find(f=>f.name.toLowerCase().split('/').pop()===n);return f?csvParse(await f.async('string')):[]};const [stops,routes,trips,stopTimes,calendar,calendarDates]=await Promise.all(['stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt','calendar_dates.txt'].map(read));if(!stops.length||!routes.length||!trips.length||!stopTimes.length)throw Error('GTFS incompleto: são necessários stops, routes, trips e stop_times.');return{stops,routes,trips,stopTimes,calendar,calendarDates,updatedAt:new Date().toISOString(),source:file.name}}
export function seconds(time){const p=String(time||'').split(':').map(Number);return p.length>=2&&p.every(Number.isFinite)?p[0]*3600+p[1]*60+(p[2]||0):NaN}
export function activeService(service,date,calendar,calendarDates){const d=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('');const override=calendarDates.find(c=>c.service_id===service&&c.date===d);if(override)return override.exception_type==='1';const c=calendar.find(c=>c.service_id===service);if(!c)return false;const day=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];return c.start_date<=d&&d<=c.end_date&&c[day]==='1'}
export function upcoming(data,stopId,date=new Date(),limit=20){const trips=new Map(data.trips.map(t=>[t.trip_id,t]));const route=new Map(data.routes.map(r=>[r.route_id,r]));const since=date.getHours()*3600+date.getMinutes()*60;return data.stopTimes.filter(s=>s.stop_id===stopId&&seconds(s.departure_time)>=since).flatMap(s=>{const t=trips.get(s.trip_id);if(!t||!activeService(t.service_id,date,data.calendar,data.calendarDates))return [];const r=route.get(t.route_id);return[{time:s.departure_time,line:r?.route_short_name||r?.route_long_name||'?',headsign:t.trip_headsign||r?.route_long_name||'',tripId:t.trip_id}]}).sort((a,b)=>seconds(a.time)-seconds(b.time)).slice(0,limit)}
export function durationMinutes(a,b){const x=seconds(a),y=seconds(b);return Number.isFinite(x)&&Number.isFinite(y)&&y>=x?Math.round((y-x)/60):null}
export function formatGTFSSeconds(value){
 const n=Math.round(value);const h=Math.floor(n/3600);const m=Math.floor((n%3600)/60);
 return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
// Correções de atraso por viagem GTFS, nunca por todas as circulações de uma linha.
export function plan(data,fromId,toId,date=new Date(),maxTransfers=2,delays={}){
 const dep=date.getHours()*3600+date.getMinutes()*60;
 if(!data||fromId===toId||!fromId||!toId)return [];
 const routeMap=new Map((data.routes||[]).map(r=>[r.route_id,r]));
 const trips=new Map((data.trips||[]).filter(t=>activeService(t.service_id,date,data.calendar||[],data.calendarDates||[]))
  .map(t=>[t.trip_id,t]));
 const grouped=new Map();
 for(const st of data.stopTimes||[]){
   if(!trips.has(st.trip_id))continue;
   if(!grouped.has(st.trip_id))grouped.set(st.trip_id,[]);
   grouped.get(st.trip_id).push(st);
 }
 const boardings=new Map();
 for(const [tripId,stops] of grouped){
   stops.sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
   const trip=trips.get(tripId);
   const offset=Math.max(0,Math.min(180,Number(delays[tripId])||0))*60;
   for(let i=0;i<stops.length-1;i++){
     const departure=seconds(stops[i].departure_time)+offset;
     if(!Number.isFinite(departure))continue;
     const item={trip,stops,i,departure,offset};
     if(!boardings.has(stops[i].stop_id))boardings.set(stops[i].stop_id,[]);
     boardings.get(stops[i].stop_id).push(item);
   }
 }
 for(const options of boardings.values())options.sort((a,b)=>a.departure-b.departure);
 const collected=[];
 let frontier=[{stop:fromId,time:dep,legs:[],used:new Set()}];
 const signature=state=>state.legs.map(l=>l.tripId+':'+l.from+':'+l.to).join('|');
 for(let depth=0;depth<=Math.max(0,Math.min(2,maxTransfers))&&frontier.length;depth++){
   const next=new Map();
   for(const state of frontier){
     const earliest=state.time+(depth?120:0);
     for(const option of boardings.get(state.stop)||[]){
       if(option.departure<earliest)continue;
       if(option.departure>dep+5*3600)break;
       if(state.used.has(option.trip.trip_id))continue;
       const {trip,stops,i,offset,departure}=option;
       for(let j=i+1;j<stops.length;j++){
         const arrival=seconds(stops[j].arrival_time)+offset;
         if(!Number.isFinite(arrival)||arrival<departure)continue;
         const line=routeMap.get(trip.route_id);
         const leg={line:line?.route_short_name||line?.route_long_name||'?',
           from:state.stop,to:stops[j].stop_id,
           departure:formatGTFSSeconds(departure),arrival:formatGTFSSeconds(arrival),
           scheduledDeparture:stops[i].departure_time,scheduledArrival:stops[j].arrival_time,
           delayMinutes:offset/60,headsign:trip.trip_headsign||'',tripId:trip.trip_id,sourceUrl:trip.sourceUrl||null};
         const item={stop:leg.to,time:arrival,legs:[...state.legs,leg],used:new Set([...state.used,trip.trip_id])};
         if(item.stop===toId){collected.push(item);continue;}
         if(depth===maxTransfers)continue;
         const choices=next.get(item.stop)||[];
         if(!choices.some(x=>signature(x)===signature(item))){
           choices.push(item);
           choices.sort((a,b)=>a.time-b.time||a.legs.length-b.legs.length);
           // Guardar alternativas distintas, não apenas a primeira chegada
           // à paragem; diferentes carreiras podem permitir transbordos.
           if(choices.length>8)choices.length=8;
           next.set(item.stop,choices);
         }
       }
     }
   }
   frontier=[...next.values()].flat().sort((a,b)=>a.time-b.time).slice(0,1500);
 }
 const unique=new Map();
 for(const state of collected){
   const key=signature(state);
   if(!unique.has(key)||unique.get(key).time>state.time)unique.set(key,state);
 }
 return [...unique.values()]
  .sort((a,b)=>a.time-b.time||a.legs.length-b.legs.length)
  .slice(0,8).map(a=>{
    const first=a.legs[0],last=a.legs.at(-1);
    const ridingMinutes=a.legs.reduce((n,l)=>n+(durationMinutes(l.departure,l.arrival)||0),0);
    const waitingMinutes=a.legs.slice(1).reduce((n,l,i)=>n+(durationMinutes(a.legs[i].arrival,l.departure)||0),0);
    return {...a,ridingMinutes,waitingMinutes,
      journeyMinutes:durationMinutes(first.departure,last.arrival),
      transfers:a.legs.length-1,scheduledOnly:!a.legs.some(l=>l.delayMinutes)};
  });
}

export function distanceMeters(a,b){const lat1=Number(a.stop_lat),lon1=Number(a.stop_lon),lat2=Number(b.stop_lat),lon2=Number(b.stop_lon);if(![lat1,lon1,lat2,lon2].every(Number.isFinite)||(!lat1&&!lon1)||(!lat2&&!lon2))return Infinity;const rad=Math.PI/180;const dl=(lat2-lat1)*rad,doLon=(lon2-lon1)*rad;const x=Math.sin(dl/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(doLon/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(x)))}
export function nearbyStops(stops,lat,lon,limit=8){return stops.filter(s=>s.stop_lat&&s.stop_lon).map(s=>({...s,distance:distanceMeters({stop_lat:lat,stop_lon:lon},s)})).filter(s=>Number.isFinite(s.distance)).sort((a,b)=>a.distance-b.distance).slice(0,limit)}
export function normalise(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
export const PLACE_ALIASES=[{name:'Teatro José Lúcio da Silva',terms:['teatro jose lucio','teatro jldsilva','tjls'],stopTerms:['largo jose lucio','lg jose lucio','lgº jose lucio'],note:'Paragem sugerida pelo nome; confirma a caminhada no mapa.'},{name:'Vidigal',terms:['vidigal'],stopTerms:['vidigal'],note:'Seleciona a paragem exata do Vidigal.'},{name:'Campo Amarelo',terms:['campo amarelo'],stopTerms:['campo amarelo'],note:'Confirma a existência da paragem e as linhas no GTFS.'}];
export function searchStops(stops,query,limit=12){const q=normalise(query);if(!q)return[];const matches=stops.filter(s=>normalise(s.stop_name).includes(q)).map(s=>({...s,matchType:'paragem'}));const alias=PLACE_ALIASES.filter(a=>a.terms.some(t=>normalise(t).includes(q)||q.includes(normalise(t))));const extra=alias.flatMap(a=>stops.filter(s=>a.stopTerms.some(t=>normalise(s.stop_name).includes(normalise(t)))).map(s=>({...s,matchType:'local de referência',placeName:a.name,placeNote:a.note})));return [...new Map([...matches,...extra].map(s=>[s.stop_id,s])).values()].slice(0,limit)}
