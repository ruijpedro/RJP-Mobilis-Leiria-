import {canonicalStopName} from './stopMatching.js';
import {equivalentStopKeys} from './stopNameLookup.js';

/**
 * Resolve uma paragem selecionada no mapa para um único ID presente nos
 * horários digitais. Nomes equivalentes são apenas pistas NOMINAIS.
 * Em caso de vários IDs, nunca escolher arbitrariamente o sentido.
 */
export function resolveMapStopForJourney(osmStop,scheduledStops=[]){
 const selectedId=String(osmStop?.stop_id||'');
 if(!selectedId.startsWith('osm:'))return {stopId:selectedId,kind:'gtfs'};
 const name=canonicalStopName(osmStop?.stop_name);
 if(!name||name==='paragem sem nome')return {stopId:'',kind:'unmatched'};
 const keys=new Set(equivalentStopKeys(osmStop.stop_name));
 const matches=scheduledStops.filter(stop=>keys.has(canonicalStopName(stop.stop_name)));
 if(matches.length!==1)return {stopId:'',kind:matches.length?'ambiguous':'unmatched',candidates:matches.length};
 const match=matches[0];
 return {stopId:match.stop_id,kind:canonicalStopName(match.stop_name)===name?'name-only':'reviewed-alias',matchedName:match.stop_name};
}
