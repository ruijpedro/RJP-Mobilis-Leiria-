/** GTFS coverage is reported from records actually installed, never inferred from official web pages. */
export function coverageReport(data, date=new Date()) {
 if (!data) return {ready:false,stops:0,routes:0,trips:0,stopTimes:0,calendar:false,notes:['Sem GTFS válido instalado.']};
 const routes=Array.isArray(data.routes)?data.routes:[];
 const stops=Array.isArray(data.stops)?data.stops:[];
 const trips=Array.isArray(data.trips)?data.trips:[];
 const stopTimes=Array.isArray(data.stopTimes)?data.stopTimes:[];
 const calendars=Array.isArray(data.calendar)?data.calendar:[];
 const exceptions=Array.isArray(data.calendarDates)?data.calendarDates:[];
 const stopIds=new Set(stops.map(x=>x.stop_id));
 const tripIds=new Set(trips.map(x=>x.trip_id));
 const routeIds=new Set(routes.map(x=>x.route_id));
 const valid=stopTimes.filter(x=>stopIds.has(x.stop_id)&&tripIds.has(x.trip_id)&&/^\d{1,2}:\d{2}:\d{2}$/.test(x.arrival_time||'')&&/^\d{1,2}:\d{2}:\d{2}$/.test(x.departure_time||''));
 const hasCalendar=calendars.length>0||exceptions.length>0;
 const ready=!!(stops.length&&routes.length&&trips.length&&valid.length&&hasCalendar&&trips.some(t=>routeIds.has(t.route_id)));
 const notes=[];
 if(!hasCalendar)notes.push('Sem calendário de circulação.');
 if(valid.length!==stopTimes.length)notes.push(`${stopTimes.length-valid.length} registos de passagem sem relação/horário utilizável.`);
 if(!stops.some(s=>Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon)))) notes.push('Paragens sem coordenadas verificáveis.');
 return {ready,stops:stops.length,routes:routes.length,trips:trips.length,stopTimes:valid.length,calendar:hasCalendar,notes,source:data.source||'não identificada',checkedAt:date.toISOString()};
}
