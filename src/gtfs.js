import JSZip from 'jszip';
export function csvParse(source){const rows=[];let row=[],field='',quote=false;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quote&&source[i+1]==='"'){field+='"';i++}else quote=!quote}else if(c===','&&!quote){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=''}else field+=c}row.push(field);if(row.some(Boolean))rows.push(row);const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,''));return rows.map(r=>Object.fromEntries(headers.map((h,j)=>[h,r[j]??''])))}
export async function importGTFS(file){const zip=await JSZip.loadAsync(file);const read=async n=>{const f=Object.values(zip.files).find(f=>f.name.toLowerCase().split('/').pop()===n);return f?csvParse(await f.async('string')):[]};const [stops,routes,trips,stopTimes,calendar,calendarDates,shapes]=await Promise.all(['stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt','calendar_dates.txt','shapes.txt'].map(read));if(!stops.length||!routes.length||!trips.length||!stopTimes.length)throw Error('GTFS incompleto: são necessários stops, routes, trips e stop_times.');return{stops,routes,trips,stopTimes,calendar,calendarDates,shapes,updatedAt:new Date().toISOString(),source:file.name}}
export function seconds(time){const p=String(time||'').split(':').map(Number);return p.length>=2&&p.every(Number.isFinite)?p[0]*3600+p[1]*60+(p[2]||0):NaN}
export function activeService(service,date,calendar,calendarDates){const d=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('');const override=calendarDates.find(c=>c.service_id===service&&c.date===d);if(override)return override.exception_type==='1';const c=calendar.find(c=>c.service_id===service);if(!c)return !calendar.length&&!calendarDates.length;const day=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];return c.start_date<=d&&d<=c.end_date&&c[day]==='1'}
export function upcoming(data,stopId,date=new Date(),limit=20){const trips=new Map(data.trips.map(t=>[t.trip_id,t]));const route=new Map(data.routes.map(r=>[r.route_id,r]));const since=date.getHours()*3600+date.getMinutes()*60;return data.stopTimes.filter(s=>s.stop_id===stopId&&seconds(s.departure_time)>=since).flatMap(s=>{const t=trips.get(s.trip_id);if(!t||!activeService(t.service_id,date,data.calendar,data.calendarDates))return [];const r=route.get(t.route_id);return[{time:s.departure_time,line:r?.route_short_name||r?.route_long_name||'?',headsign:t.trip_headsign||r?.route_long_name||'',tripId:t.trip_id}]}).sort((a,b)=>seconds(a.time)-seconds(b.time)).slice(0,limit)}
export function plan(data,fromId,toId,date=new Date(),maxTransfers=2){
 const dep=date.getHours()*3600+date.getMinutes()*60;
 const groups=new Map();
 for(const st of data.stopTimes){if(!groups.has(st.trip_id))groups.set(st.trip_id,[]);groups.get(st.trip_id).push(st)}
 const routes=new Map(data.routes.map(r=>[r.route_id,r]));
 const indexed=new Map();
 for(const trip of data.trips){
  if(!activeService(trip.service_id,date,data.calendar,data.calendarDates))continue;
  const arr=(groups.get(trip.trip_id)||[]).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
  for(let i=0;i<arr.length;i++){
   const st=arr[i];if(!indexed.has(st.stop_id))indexed.set(st.stop_id,[]);
   indexed.get(st.stop_id).push({trip,arr,index:i});
  }
 }
 let layer=[{stop:fromId,time:dep,legs:[],used:new Set()}];
 const answers=[];
 for(let transfer=0;transfer<=maxTransfers;transfer++){
  const next=new Map();
  for(const state of layer){
   for(const entry of indexed.get(state.stop)||[]){
    const {trip,arr,index}=entry;
    const boarding=seconds(arr[index].departure_time);
    if(boarding<state.time+(state.legs.length?120:0)||boarding>dep+5*3600)continue;
    if(state.used.has(trip.trip_id))continue;
    for(let k=index+1;k<arr.length;k++){
     const arrival=seconds(arr[k].arrival_time);if(!Number.isFinite(arrival))continue;
     const leg={line:routes.get(trip.route_id)?.route_short_name||'?',from:state.stop,to:arr[k].stop_id,departure:arr[index].departure_time,arrival:arr[k].arrival_time,headsign:trip.trip_headsign||'',tripId:trip.trip_id};
     const item={stop:arr[k].stop_id,time:arrival,legs:[...state.legs,leg],used:new Set([...state.used,trip.trip_id])};
     if(item.stop===toId)answers.push(item);
     else if(!next.has(item.stop)||next.get(item.stop).time>arrival)next.set(item.stop,item);
    }
   }
  }
  layer=[...next.values()];
  if(answers.length>=5)break;
 }
 return answers.sort((a,b)=>a.time-b.time||a.legs.length-b.legs.length).slice(0,5);
}

export function distanceMeters(a,b){const lat1=Number(a.stop_lat),lon1=Number(a.stop_lon),lat2=Number(b.stop_lat),lon2=Number(b.stop_lon);if(![lat1,lon1,lat2,lon2].every(Number.isFinite)||(!lat1&&!lon1)||(!lat2&&!lon2))return Infinity;const rad=Math.PI/180;const dl=(lat2-lat1)*rad,doLon=(lon2-lon1)*rad;const x=Math.sin(dl/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(doLon/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(x)))}
export function nearbyStops(stops,lat,lon,limit=8){return stops.filter(s=>s.stop_lat&&s.stop_lon).map(s=>({...s,distance:distanceMeters({stop_lat:lat,stop_lon:lon},s)})).filter(s=>Number.isFinite(s.distance)).sort((a,b)=>a.distance-b.distance).slice(0,limit)}
export function normalise(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
export const PLACE_ALIASES=[{name:'Teatro José Lúcio da Silva',terms:['teatro jose lucio','teatro jldsilva','tjls'],stopTerms:['largo jose lucio','lg jose lucio','lgº jose lucio'],note:'Paragem sugerida pelo nome; confirma a caminhada no mapa.'},{name:'Vidigal',terms:['vidigal'],stopTerms:['vidigal'],note:'Seleciona a paragem exata do Vidigal.'},{name:'Campo Amarelo',terms:['campo amarelo'],stopTerms:['campo amarelo'],note:'Confirma a existência da paragem e as linhas no GTFS.'}];
export function searchStops(stops,query,limit=12){const q=normalise(query);if(!q)return[];const matches=stops.filter(s=>normalise(s.stop_name).includes(q)).map(s=>({...s,matchType:'paragem'}));const alias=PLACE_ALIASES.filter(a=>a.terms.some(t=>normalise(t).includes(q)||q.includes(normalise(t))));const extra=alias.flatMap(a=>stops.filter(s=>a.stopTerms.some(t=>normalise(s.stop_name).includes(normalise(t)))).map(s=>({...s,matchType:'local de referência',placeName:a.name,placeNote:a.note})));return [...new Map([...matches,...extra].map(s=>[s.stop_id,s])).values()].slice(0,limit)}
