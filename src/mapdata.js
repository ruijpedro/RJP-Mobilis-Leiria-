import {activeService,seconds,upcoming} from './gtfs.js';
export function validStops(stops){return (stops||[]).filter(s=>s.stop_lat!==''&&s.stop_lon!==''&&Number.isFinite(+s.stop_lat)&&Number.isFinite(+s.stop_lon)&&Math.abs(+s.stop_lat)<=90&&Math.abs(+s.stop_lon)<=180)}
export function linesForStop(data,id,date=new Date()){
 if(!data)return[];
 const tripIndex=new Map(data.trips.map(t=>[t.trip_id,t]));const routes=new Map(data.routes.map(r=>[r.route_id,r]));const found=new Map();
 for(const st of data.stopTimes){if(st.stop_id!==id)continue;const t=tripIndex.get(st.trip_id);if(!t||!activeService(t.service_id,date,data.calendar,data.calendarDates))continue;const r=routes.get(t.route_id);if(!r)continue;const name=r.route_short_name||r.route_long_name||'?';const key=t.route_id+'|'+(t.trip_headsign||'');if(!found.has(key))found.set(key,{routeId:t.route_id,line:name,destination:t.trip_headsign||r.route_long_name||'Destino não identificado',color:r.route_color?'#'+r.route_color:'#1565a1'});}
 return [...found.values()].sort((a,b)=>a.line.localeCompare(b.line,'pt',{numeric:true}));
}
export function stopsOnLine(data,routeId){if(!data)return[];const ids=new Set(data.trips.filter(t=>t.route_id===routeId).map(t=>t.trip_id));const seen=new Set();return data.stopTimes.filter(s=>ids.has(s.trip_id)&&!seen.has(s.stop_id)&&seen.add(s.stop_id)).map(s=>data.stops.find(st=>st.stop_id===s.stop_id)).filter(Boolean)}
export function routeShapes(data,routeId){if(!data?.shapes?.length)return[];const ids=new Set(data.trips.filter(t=>t.route_id===routeId).map(t=>t.shape_id).filter(Boolean));const groups=new Map();for(const s of data.shapes){if(!ids.has(s.shape_id))continue;const p=[+s.shape_pt_lat,+s.shape_pt_lon];if(!p.every(Number.isFinite))continue;if(!groups.has(s.shape_id))groups.set(s.shape_id,[]);groups.get(s.shape_id).push(s)}return [...groups.values()].map(arr=>arr.sort((a,b)=>+a.shape_pt_sequence- +b.shape_pt_sequence).map(s=>[+s.shape_pt_lat,+s.shape_pt_lon]));}
export function nextDepartures(data,id,date,limit=8){return upcoming(data,id,date,limit).map(p=>({...p,label:p.headsign||'Destino não indicado'}))}
