import {canonicalStopName} from './stopMatching.js';
import {equivalentStopKeys} from './stopNameLookup.js';

/** Filtra paragens OSM pelas linhas documentadas, sem inferir plataformas. */
export function filterMappedStops(stops=[],auditByStop=new Map(),{search='',coverage='all',lineName=''}={}){
 const q=canonicalStopName(search);
 const chosen=String(lineName||'').trim();
 return stops.filter(stop=>{
  const row=auditByStop.get(stop.stop_id);
  const name=canonicalStopName(stop.stop_name);
  const names=equivalentStopKeys(stop.stop_name);
  if(q&&!names.some(key=>key.includes(q))&&!name.includes(q))return false;
  if(chosen&&!(row?.lines||[]).some(value=>String(value)===chosen))return false;
  if(coverage==='no-lines'&&row?.lines?.length)return false;
  if(coverage==='no-times'&&(row?.published||row?.estimated))return false;
  if(coverage==='estimated'&&!row?.estimated)return false;
  if(coverage==='published'&&!row?.published)return false;
  return true;
 });
}
