// Rotas esquemáticas derivadas da ordem real de paragens nos ficheiros GTFS importados.
export function availableLines(data){return data?.routes||[]}
export function routeColor(id){
 const palette=['#e63946','#1976d2','#2e7d32','#8e24aa','#ef6c00','#00838f','#ad1457','#6d4c41','#455a64','#7b1fa2','#9e9d24','#3949ab'];
 const raw=String(id??'');
 const suffix=raw.match(/(?:mobilis[-_ ]*)?(\d+)$/i);
 if(suffix){const number=Number(suffix[1]);if(number>=1&&number<=palette.length)return palette[number-1]}
 let hash=2166136261;for(const c of raw){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}
 return palette[(hash>>>0)%palette.length];
}
export function routeStopSequence(data,routeId){if(!data)return[];const trip=data.trips.find(t=>t.route_id===routeId);if(!trip)return[];const lookup=new Map(data.stops.map(s=>[s.stop_id,s]));return data.stopTimes.filter(s=>s.trip_id===trip.trip_id).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence)).map(s=>lookup.get(s.stop_id)).filter(s=>s&&Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon))&&s.stop_lat!==''&&s.stop_lon!=='').map(s=>[Number(s.stop_lat),Number(s.stop_lon)])}
