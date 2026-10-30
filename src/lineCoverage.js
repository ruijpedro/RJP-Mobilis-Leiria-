/** Report only actual GTFS timetable coverage; source discovery alone is not coverage. */
export function lineCoverage(data) {
 const routes=Array.isArray(data?.routes)?data.routes:[];
 const trips=Array.isArray(data?.trips)?data.trips:[];
 const times=Array.isArray(data?.stopTimes)?data.stopTimes:[];
 const stops=Array.isArray(data?.stops)?data.stops:[];
 const ids=new Set(stops.map(s=>s.stop_id));
 const byTrip=new Map();
 for(const s of times) {
   if(!ids.has(s.stop_id) || !/^\d{1,2}:\d{2}:\d{2}$/.test(s.departure_time||''))continue;
   if(!byTrip.has(s.trip_id))byTrip.set(s.trip_id,new Set());
   byTrip.get(s.trip_id).add(s.stop_id);
 }
 return routes.map(route=>{
   const relevant=trips.filter(t=>t.route_id===route.route_id);
   const complete=relevant.filter(t=>(byTrip.get(t.trip_id)?.size||0)>=2);
   const served=new Set();
   for(const t of complete)for(const id of byTrip.get(t.trip_id)||[])served.add(id);
   return {id:route.route_id, number:route.route_short_name||route.route_id,
     journeys:complete.length, stops:served.size,
     status:complete.length?'Viagens estruturadas — confirmar calendário':'Sem viagens completas'};
 });
}
export function networkReady(data){ return lineCoverage(data).some(line=>line.journeys>0) &&
  !!((data?.calendar?.length||0)+(data?.calendarDates?.length||0)); }
