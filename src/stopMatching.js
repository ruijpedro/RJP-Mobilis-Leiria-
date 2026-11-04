import {distanceMeters,normalise} from './gtfs.js';

const hasCoordinates=s=>s&&s.stop_lat!==''&&s.stop_lon!==''&&Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon));
// Harmonizar apenas abreviaturas inequívocas presentes nas tabelas Mobilis/OSM.
// Não aproximar paragens diferentes apenas porque partilham palavras.
export function canonicalStopName(value){
 return normalise(value)
  .replace(/^av(?:enida)?\s+/, 'avenida ')
  .replace(/^lg(?:o)?\s+/, 'largo ')
  .replace(/^r(?:ua)?\s+/, 'rua ')
  .replace(/\s+/g,' ').trim();
}
const acceptableName=s=>s&&s.length>=5&&s!=='paragem sem nome';

// Não deduzir que paragens do mesmo nome são a mesma plataforma/direção.
// Com coordenadas, aceitar apenas proximidade + nome igual; sem coordenadas,
// aceitar um único nome exato, explicitando que o lado da rua é desconhecido.
export function matchMappedStop(osmStop,gtfsStops,maximumMetres=70){
  const name=canonicalStopName(osmStop?.stop_name);
  if(!acceptableName(name))return {status:'unmatched',candidates:[],stop:null};
  const exact=gtfsStops.filter(s=>canonicalStopName(s.stop_name)===name);
  if(hasCoordinates(osmStop)){
    const close=exact.filter(hasCoordinates)
      .map(s=>({...s,distance:distanceMeters(osmStop,s)}))
      .filter(s=>s.distance<=maximumMetres)
      .sort((a,b)=>a.distance-b.distance);
    if(close.length===1)return {status:'position',stop:close[0],candidates:close};
    if(close.length>1)return {status:'ambiguous',stop:null,candidates:close};
  }
  // A amostra Mobilis não contém coordenadas GTFS. Um nome único pode
  // permitir consultar horários, mas sem garantir plataforma ou sentido.
  const unknownPosition=exact.filter(s=>!hasCoordinates(s));
  if(unknownPosition.length===1&&exact.length===1)
    return {status:'name-only',stop:unknownPosition[0],candidates:unknownPosition};
  return {status:exact.length?'ambiguous':'unmatched',stop:null,candidates:exact.slice(0,8)};
}

export function linesAtStop(data,stopId){
  if(!data||!stopId)return [];
  const tripIds=new Set((data.stopTimes||[]).filter(x=>x.stop_id===stopId).map(x=>x.trip_id));
  const routes=new Map((data.routes||[]).map(r=>[r.route_id,r]));
  const lines=new Map();
  for(const trip of data.trips||[]){
    if(!tripIds.has(trip.trip_id))continue;
    const route=routes.get(trip.route_id);
    const line=route?.route_short_name||route?.route_long_name;
    if(line)lines.set(trip.route_id,{id:trip.route_id,line,description:route.route_long_name||''});
  }
  return [...lines.values()].sort((a,b)=>a.line.localeCompare(b.line,'pt',{numeric:true}));
}
