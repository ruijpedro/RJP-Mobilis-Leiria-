// Rotas esquemáticas derivadas da ordem real de paragens nos ficheiros GTFS importados.
export function availableLines(data){return data?.routes||[]}
export function routeColor(id){let hash=0;for(const c of String(id))hash=(hash*31+c.charCodeAt(0))>>>0;return `hsl(${hash%360} 70% 40%)`}
export function routeStopSequence(data,routeId){if(!data)return[];const trip=data.trips.find(t=>t.route_id===routeId);if(!trip)return[];const lookup=new Map(data.stops.map(s=>[s.stop_id,s]));return data.stopTimes.filter(s=>s.trip_id===trip.trip_id).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence)).map(s=>lookup.get(s.stop_id)).filter(s=>s&&Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon))&&s.stop_lat!==''&&s.stop_lon!=='').map(s=>[Number(s.stop_lat),Number(s.stop_lon)])}
