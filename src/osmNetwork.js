const URL=`${import.meta.env?.BASE_URL||'/'}data/osm-network.json`;
export async function loadOsmNetwork(){
 try{
  const response=await fetch(URL,{cache:'no-cache'});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const doc=await response.json();
  return Array.isArray(doc.routes)?doc.routes.filter(route=>route.mobilis||route.network?.toLowerCase().includes('mobilis')):[];
 }catch{return []}
}
export function routeDescription(route){
 return [route.ref&&`Linha ${route.ref}`,route.from&&route.to&&`${route.from} → ${route.to}`].filter(Boolean).join(' · ')||route.name||`Relação OSM ${route.osm_id}`
}
