// Importação de horários oficiais previamente transcritos e verificados.
// Nunca inferir minutos intermediários a partir de imagens esquemáticas.
const validTime=t=>/^([01]\d|2[0-9]):[0-5]\d(?::[0-5]\d)?$/.test(String(t||''));
const validDate=t=>/^20\d{6}$/.test(String(t||''));
const cleanTime=t=>t.length===5?t+':00':t;
export function validateOfficialSchedule(payload){
 if(!payload||payload.schemaVersion!==1||!Array.isArray(payload.services))
   throw Error('Formato de horários oficiais inválido.');
 const today=[];
 const routeNames=new Set(),tripIds=new Set();
 for(const item of payload.services){
   if(!/^[1-9]$/.test(String(item.line)))throw Error('Linha Mobilis inválida.');
   if(!item.source?.startsWith('https://mobilis.pt/'))throw Error('Falta a fonte oficial Mobilis.');
   if(!validDate(item.validFrom)||!validDate(item.validUntil)||item.validFrom>item.validUntil)
     throw Error('Datas de validade inválidas.');
   if(!['weekdays','saturday','sunday','daily'].includes(item.days))
     throw Error('Calendário de circulação por confirmar.');
   if(!item.direction||!Array.isArray(item.stops)||item.stops.length<2)
     throw Error('Sentido ou sequência de paragens incompleta.');
   const key=item.id||item.line+'-'+item.days+'-'+item.direction;
   if(tripIds.has(key))throw Error('Identificador de circulação duplicado.');
   tripIds.add(key);
   let previous=-1;
   for(const stop of item.stops){
     if(!stop.stopId||!stop.stopName||!validTime(stop.time))
       throw Error('Paragem ou hora por confirmar na linha '+item.line);
     const sec=stop.time.split(':').map(Number).reduce((acc,n,i)=>acc+[3600,60,1][i]*n,0);
     if(sec<previous)throw Error('Horários fora de ordem: '+key);
     previous=sec;
   }
   routeNames.add(String(item.line));today.push(item);
 }
 return today;
}
// Só conciliar paragens com o MESMO nome normalizado e nunca quando
// dois IDs aparecem na mesma circulação (possíveis sentidos/lados distintos).
// Não juntar por distância estimada nem por nomes apenas semelhantes.
export function sharedOfficialStopIds(services){
 const name=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').replace(/[^a-z0-9]+/g,' ').trim();
 const grouped=new Map(),ambiguous=new Set();
 for(const service of services){
   const within=new Map();
   for(const stop of service.stops){
     const key=name(stop.stopName);
     if(!key)continue;
     if(!within.has(key))within.set(key,new Set());
     within.get(key).add(stop.stopId);
     if(!grouped.has(key))grouped.set(key,new Set());
     grouped.get(key).add(stop.stopId);
   }
   for(const [key,ids] of within)if(ids.size>1)ambiguous.add(key);
 }
 const canonical=new Map();
 for(const [key,ids] of grouped){
   if(ambiguous.has(key)||ids.size<2)continue;
   const preferred=[...ids].sort()[0];
   for(const id of ids)canonical.set(id,preferred);
 }
 return canonical;
}
export function officialSchedulesToGTFS(payload){
 const services=validateOfficialSchedule(payload);
 const shared=sharedOfficialStopIds(services);
 const routes=[],stops=[],trips=[],stopTimes=[],calendar=[];
 const routeSeen=new Set(),stopSeen=new Set();
 const dayMask={
  weekdays:[1,1,1,1,1,0,0],saturday:[0,0,0,0,0,1,0],
  sunday:[0,0,0,0,0,0,1],daily:[1,1,1,1,1,1,1]
 };
 const order=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
 for(const [index,service] of services.entries()){
   const routeId='mobilis-official-'+service.line;
   if(!routeSeen.has(routeId)){routeSeen.add(routeId);routes.push({route_id:routeId,route_short_name:String(service.line),route_long_name:service.direction});}
   const serviceId='official-service-'+index;
   const tripId='official-trip-'+index;
   const weekly=Object.fromEntries(order.map((day,i)=>[day,String(dayMask[service.days][i])]));
   calendar.push({service_id:serviceId,start_date:service.validFrom,end_date:service.validUntil,...weekly});
   trips.push({trip_id:tripId,route_id:routeId,service_id:serviceId,trip_headsign:service.direction,sourceUrl:service.source});
   service.stops.forEach((stop,i)=>{
     const sharedId=shared.get(stop.stopId)||stop.stopId;
     if(!stopSeen.has(sharedId)){
       stopSeen.add(sharedId);
       stops.push({stop_id:sharedId,stop_name:stop.stopName,stop_lat:stop.lat==null?'':String(stop.lat),stop_lon:stop.lon==null?'':String(stop.lon)});
     }
     stopTimes.push({trip_id:tripId,stop_id:sharedId,stop_sequence:String(i+1),arrival_time:cleanTime(stop.time),departure_time:cleanTime(stop.time)});
   });
 }
 return {stops,routes,trips,stopTimes,calendar,calendarDates:[],source:'Horários oficiais Mobilis (validados)',updatedAt:new Date().toISOString(),officialScheduleSources:[...new Set(services.map(s=>s.source))]};
}
export function mergeOfficialGTFS(base,official){
 if(!official?.trips?.length)return base;
 if(!base)return official;
 // Prioridade às carreiras oficiais já validadas, sem duplicar dados parciais.
 const officialLines=new Set(official.routes.map(r=>String(r.route_short_name)));
 const removedRoutes=new Set(base.routes.filter(r=>officialLines.has(String(r.route_short_name))).map(r=>r.route_id));
 const keptTrips=(base.trips||[]).filter(t=>!removedRoutes.has(t.route_id));
 const keptIds=new Set(keptTrips.map(t=>t.trip_id));
 const keptServices=new Set(keptTrips.map(t=>t.service_id));
 return {...base,
  stops:[...new Map([...(base.stops||[]),...official.stops].map(s=>[s.stop_id,s])).values()],
  routes:[...base.routes.filter(r=>!removedRoutes.has(r.route_id)),...official.routes],
  trips:[...keptTrips,...official.trips],
  stopTimes:[...(base.stopTimes||[]).filter(s=>keptIds.has(s.trip_id)),...official.stopTimes],
  calendar:[...(base.calendar||[]).filter(s=>keptServices.has(s.service_id)),...official.calendar],
  calendarDates:[...(base.calendarDates||[]).filter(s=>keptServices.has(s.service_id)),...official.calendarDates],
  officialScheduleSources:official.officialScheduleSources,
  source:(base.source||'Horários parciais')+' + fontes oficiais verificadas'};
}
