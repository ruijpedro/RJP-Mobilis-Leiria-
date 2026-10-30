// OSM stops are a discovery aid, never a source of scheduled departures.
const KEY='rjp-leiria-osm-stops-v1';
const ENDPOINTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
export function parseOsmStops(payload){
 const seen=new Map();
 for(const e of (payload?.elements||[])){
  const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
  if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  const tags=e.tags||{};
  if(tags.highway!=='bus_stop'&&tags.public_transport!=='platform'&&tags.amenity!=='bus_station')continue;
  const key=`osm:${e.type}:${e.id}`;
  seen.set(key,{stop_id:key,stop_name:tags.name||tags.local_ref||tags.ref||'Paragem sem nome',stop_lat:String(lat),stop_lon:String(lon),osm:true,ref:tags.ref||'',operator:tags.operator||''});
 }
 return [...seen.values()];
}
export async function loadOsmStops({force=false}={}){
 try{const cached=JSON.parse(localStorage.getItem(KEY)||'null');if(!force&&cached&&Date.now()-cached.at<7*864e5)return {stops:cached.stops,cached:true};}catch{}
 // Around Leiria urban area; independent of the user's precise GPS.
 const query='[out:json][timeout:22];(node["highway"="bus_stop"](39.68,-8.89,39.81,-8.72);node["public_transport"="platform"](39.68,-8.89,39.81,-8.72);way["public_transport"="platform"](39.68,-8.89,39.81,-8.72););out center;';
 for(const endpoint of ENDPOINTS){
  try{const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),14000);
   let response;try{response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:ctrl.signal});}finally{clearTimeout(timeout)}
   if(!response.ok)throw new Error('OSM HTTP '+response.status);
   const stops=parseOsmStops(await response.json());if(!stops.length)throw new Error('Sem paragens OSM');
   try{localStorage.setItem(KEY,JSON.stringify({at:Date.now(),stops}))}catch{}
   return {stops,cached:false};
  }catch{}
 }
 try{const cached=JSON.parse(localStorage.getItem(KEY)||'null');if(cached?.stops?.length)return {stops:cached.stops,cached:true,stale:true}}catch{}
 return {stops:[],error:'Não foi possível consultar as paragens OpenStreetMap agora.'};
}
