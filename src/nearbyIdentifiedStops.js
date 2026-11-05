import {distanceMeters} from './gtfs.js';
import {stopLineAssociation} from './stopLineAssociations.js';

/**
 * Sugestões de paragens OSM próximas com linhas identificadas no catálogo.
 * Distâncias em linha reta; NÃO garantem percurso pedonal, sentido, serviço
 * à hora selecionada ou correspondência com uma plataforma GTFS.
 */
export function nearbyIdentifiedStops(selected,osmStops,lineIndex,{radiusMeters=750,limit=5}={}){
 if(!selected||!Array.isArray(osmStops))return [];
 const results=[];
 for(const stop of osmStops){
  if(stop.stop_id===selected.stop_id)continue;
  const distance=distanceMeters(selected,stop);
  if(!Number.isFinite(distance)||distance<12||distance>radiusMeters)continue;
  const association=stopLineAssociation(stop,lineIndex);
  if(!association.lines.length)continue;
  results.push({...stop,distance,identifiedLines:association.lines,associationStatus:association.status});
 }
 return results.sort((a,b)=>a.distance-b.distance||a.stop_name.localeCompare(b.stop_name,'pt')).slice(0,limit);
}
