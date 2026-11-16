const URL=`${import.meta.env?.BASE_URL||'/'}data/osm-network.json`;
export async function loadOsmNetwork(){
 try{
  const response=await fetch(URL,{cache:'no-cache'});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const doc=await response.json();
  return Array.isArray(doc.routes)?doc.routes.filter(route=>{const ref=String(route.ref||'').replace(/^linha\s+/i,'').trim();return /^[1-9]$/.test(ref)&&(route.mobilis||String(route.network||'').toLowerCase().includes('mobilis'))&&Array.isArray(route.shape_segments)&&route.shape_segments.length>0;}):[];
 }catch{return []}
}
export function routeDescription(route){
 return [route.ref&&`Linha ${String(route.ref).replace(/^linha\\s+/i,'')}`,route.from&&route.to&&`${route.from} → ${route.to}`].filter(Boolean).join(' · ')||route.name||`Relação OSM ${route.osm_id}`
}

/** Só associa geometria a uma linha quando a referência OSM coincide exatamente.
 * Referências ambíguas ou sem geometria mantêm o traçado GTFS esquemático.
 */
export function osmSegmentsForLine(line,routes){
 if(!line||!Array.isArray(routes))return [];
 const ref=String(line.route_short_name||'').trim();
 if(!ref)return [];
 const matches=routes.filter(r=>String(r.ref||'').replace(/^linha\\s+/i,'').trim()===ref&&Array.isArray(r.shape_segments));
 const segments=matches.flatMap(r=>r.shape_segments).filter(segment=>
  Array.isArray(segment)&&segment.length>1&&segment.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])));
 return segments;
}
