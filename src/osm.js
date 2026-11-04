import {distanceMeters,normalise} from './gtfs.js';
export const OVERPASS_QUERY=`[out:json][timeout:60];(node["highway"="bus_stop"](39.68,-8.89,39.81,-8.72);node["public_transport"="platform"](39.68,-8.89,39.81,-8.72);way["public_transport"="platform"](39.68,-8.89,39.81,-8.72););out center;`;
const ENDPOINTS=['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
const BASE=import.meta.env?.BASE_URL||'/';
const BUNDLED=`${BASE}data/osm-stops-leiria.json`;
// OSM pode incluir plataformas ferroviárias chamadas «Linha 1», «Linha 2».
// Não são paragens de autocarro e nunca devem receber o ícone Mobilis.
export const isRailPlatformLabel=name=>/^(?:linha|via)\s*\d+[a-z]?$/i.test(normalise(name));
const valid=s=>s&&s.stop_lat!==''&&s.stop_lon!==''&&Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon))&&Math.abs(Number(s.stop_lat))<=90&&Math.abs(Number(s.stop_lon))<=180;
export function parseOSM(payload){
 const candidates=(payload.elements||[]).map(e=>({stop_id:`osm:${e.type}:${e.id}`,osm_id:e.id,stop_name:e.tags?.name||e.tags?.['name:pt']||e.tags?.local_ref||e.tags?.ref||'Paragem sem nome',stop_lat:String(e.lat??e.center?.lat??''),stop_lon:String(e.lon??e.center?.lon??''),ref:e.tags?.ref||'',operator:e.tags?.operator||'',source:'OpenStreetMap'})).filter(s=>valid(s)&&!isRailPlatformLabel(s.stop_name));
 const found=[];for(const stop of candidates){if(!found.some(other=>distanceMeters(other,stop)<15&&normalise(other.stop_name)===normalise(stop.stop_name)))found.push(stop)}return found;
}
function validateStops(stops){return Array.isArray(stops)?stops.filter(s=>valid(s)&&!isRailPlatformLabel(s.stop_name)).map(s=>({...s,source:'OpenStreetMap'})):[]}
async function bundled(){
 const response=await fetch(BUNDLED,{cache:'no-cache'});
 if(!response.ok)throw Error('Cópia OSM indisponível: HTTP '+response.status);
 const stops=validateStops(await response.json());
 if(!stops.length)throw Error('A cópia OSM não contém paragens válidas.');
 return {stops,cache:true,source:'GitHub/OSM',warning:'Paragens do OpenStreetMap guardadas na aplicação. Os horários são tratados separadamente.'};
}
async function remote(){
 let error;
 for(const endpoint of ENDPOINTS){
  const ctrl=new AbortController();
  const timeout=setTimeout(()=>ctrl.abort(),18000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:OVERPASS_QUERY}),signal:ctrl.signal});
   if(!response.ok)throw Error('Overpass HTTP '+response.status);
   const stops=parseOSM(await response.json());
   if(stops.length<20)throw Error('Resposta OSM incompleta');
   return {stops,cache:false,source:'Overpass'};
  }catch(e){error=e}finally{clearTimeout(timeout)}
 }
 throw error||Error('Servidores OSM indisponíveis');
}
export async function loadOSM({force=false}={}){
 const key='rjp-mobilis-osm-v2';
 let old=null;
 try{old=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 if(!force){
  try{const result=await bundled();try{localStorage.setItem(key,JSON.stringify({...result,at:Date.now()}))}catch{}return result}catch(e){
   if(old?.stops?.length)return {...old,stops:validateStops(old.stops),cache:true,warning:'Cópia incluída indisponível; a utilizar a última lista guardada.'};
  }
 }
 try{
  const result=await remote();
  try{localStorage.setItem(key,JSON.stringify({...result,at:Date.now()}))}catch{}
  return result;
 }catch(e){
  try{const result=await bundled();return {...result,warning:'Consulta Overpass falhou; foram mantidas as paragens incluídas na app.'}}catch{}
  if(old?.stops?.length)return {...old,stops:validateStops(old.stops),cache:true,warning:'Sem rede; a utilizar a última lista guardada.'};
  throw e;
 }
}
export function associateGTFS(osmStop,gtfsStops,radius=90){
 const namelessCoords=gtfsStops.filter(s=>!s.stop_lat||!s.stop_lon);
 const named=namelessCoords.filter(s=>normalise(s.stop_name)===normalise(osmStop.stop_name)&&normalise(s.stop_name).length>12);
 if(named.length===1)return {...named[0],distance:NaN};
 const close=gtfsStops.map(s=>({...s,distance:distanceMeters(osmStop,s)})).filter(s=>s.distance<=radius).sort((a,b)=>a.distance-b.distance);
 return close.find(s=>normalise(s.stop_name)===normalise(osmStop.stop_name))||close.find(s=>normalise(s.stop_name).includes(normalise(osmStop.stop_name))||normalise(osmStop.stop_name).includes(normalise(s.stop_name)))||null;
}
