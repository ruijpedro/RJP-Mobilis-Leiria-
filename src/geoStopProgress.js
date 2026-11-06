import {canonicalStopName} from './stopMatching.js';
import {equivalentStopKeys} from './stopNameLookup.js';

// Geometria de apoio ao cálculo: distância em linha reta entre pontos OSM,
// NÃO representa a distância rodoviária nem a plataforma confirmada.
export function metresBetween(a,b){
 const rad=Math.PI/180;
 const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
function position(stop){
 const lat=Number(stop?.stop_lat),lon=Number(stop?.stop_lon);
 if(stop?.stop_lat==null||stop?.stop_lon==null||stop.stop_lat===''||stop.stop_lon==='')return null;
 return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>39&&lat<41&&lon> -9.5&&lon< -7.5?{lat,lon}:null;
}
export function buildOsmPositionIndex(stops=[]){
 const groups=new Map();
 for(const stop of stops){
  const key=canonicalStopName(stop.stop_name);
  const coords=position(stop);
  if(!key||key==='paragem sem nome'||!coords)continue;
  const list=groups.get(key)||[];
  list.push({...coords,osmId:stop.stop_id});groups.set(key,list);
 }
 const indexed=new Map();
 for(const [key,items] of groups){
  if(items.length===1){
   indexed.set(key,{...items[0],quality:'one-osm-candidate',osmIds:[items[0].osmId]});
  }else{
   // Paragens com o mesmo nome podem corresponder aos dois sentidos.
   // Não inventar uma plataforma: permitir APENAS um centro geométrico para
   // ponderação de tempos se os candidatos estiverem muito próximos.
   const maxDistance=Math.max(...items.flatMap(a=>items.map(b=>metresBetween(a,b))));
   if(maxDistance<=65){
    indexed.set(key,{
     lat:items.reduce((n,p)=>n+p.lat,0)/items.length,
     lon:items.reduce((n,p)=>n+p.lon,0)/items.length,
     quality:'shared-name-nearby-osm',osmIds:items.map(x=>x.osmId)
    });
   }
  }
 }
 // Estender apenas equivalências já revistas, sem suplantar nomes diretos.
 // Usadas para ponderar tempos entre âncoras, não para validar plataformas.
 const aliases=[];
 for(const [name,point] of indexed){
  for(const key of equivalentStopKeys(name)){
   if(key!==name&&!indexed.has(key))aliases.push([key,{...point,quality:'alias-'+point.quality}]);
  }
 }
 for(const [key,point] of aliases)if(!indexed.has(key))indexed.set(key,point);
 return indexed;
}
export function routeDistanceFractions(names,osmIndex,start,end){
 const samples=names.slice(start,end+1).map(name=>osmIndex.get(canonicalStopName(name))||null);
 const indices=samples.map((p,i)=>p?i:-1).filter(i=>i>=0);
 // O cálculo geográfico só é válido com pelo menos três posições conhecidas
 // incluindo as extremidades. Caso contrário usar ordem das paragens.
 if(indices.length<3||indices[0]!==0||indices.at(-1)!==samples.length-1)return null;
 const progress=new Array(samples.length).fill(null);
 progress[0]=0;
 let total=0,previous=0;
 for(let k=1;k<indices.length;k++){
  const right=indices[k],left=indices[k-1];
  const d=metresBetween(samples[left],samples[right]);
  if(!Number.isFinite(d))return null;
  // Entre pontos com geometria em falta, repartir o troço linearmente
  // pelo número de paragens; não criar coordenadas fictícias.
  for(let j=left+1;j<=right;j++)progress[j]=total+d*(j-left)/(right-left);
  total+=d;previous=right;
 }
 // Curvas e voltas circulares podem ter extremos coincidentes.
 // Sem comprimento suficiente para ponderar, fica-se com ordem sequencial.
 if(total<30)return null;
 // Distância demasiado pequena entre âncoras com muitas paragens é suspeita.
 if(total<samples.length*8)return null;
 return progress.map(d=>d/total);
}
