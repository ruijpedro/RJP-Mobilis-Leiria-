// Diagnóstico da cobertura real de cada paragem na base GTFS disponível.
// Não assume que paragens OSM ou sequências de referência têm horários.
export function stopCoverage(data){
 const stops=data?.stops||[], routes=new Map((data?.routes||[]).map(r=>[r.route_id,r.route_short_name||r.route_id]));
 const trips=new Map((data?.trips||[]).map(t=>[t.trip_id,t]));
 const entries=new Map(stops.map(s=>[s.stop_id,{stopId:s.stop_id,name:s.stop_name,
   lines:new Set(),departures:0,coordinates:validCoordinates(s)}]));
 for(const t of data?.stopTimes||[]){
   const stop=entries.get(t.stop_id),trip=trips.get(t.trip_id);
   if(!stop||!trip||!routes.has(trip.route_id))continue;
   if(!/^\d{1,2}:\d\d:\d\d$/.test(t.departure_time||''))continue;
   stop.lines.add(String(routes.get(trip.route_id)));
   stop.departures++;
 }
 return [...entries.values()].map(s=>({...s,lines:[...s.lines].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true})),
  status:s.departures?'com-horarios':'sem-horarios'})).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
}
function validCoordinates(stop){
 const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);
 return stop.stop_lat!==''&&stop.stop_lon!==''&&stop.stop_lat!=null&&stop.stop_lon!=null&&
  Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&!(lat===0&&lon===0);
}
export function networkCoverageSummary(data){
 const stops=stopCoverage(data);
 return {total:stops.length,withTimetables:stops.filter(s=>s.departures>0).length,
  withoutTimetables:stops.filter(s=>s.departures===0).length,
  withCoordinates:stops.filter(s=>s.coordinates).length,
  multiLine:stops.filter(s=>s.lines.length>1).length,
  stops};
}
