import {canonicalStopName} from './stopMatching.js';
import {equivalentStopKeys} from './stopNameLookup.js';
import {buildStopLineIndex,stopLineAssociation} from './stopLineAssociations.js';

/** Cobertura de TODAS as paragens OSM, independentemente de haver horários.
 * Informação NOMINAL: não garante plataforma, direção ou serviço no dia.
 * As estimativas são contadas somente se já foram calculadas entre âncoras.
 */
export function auditMappedStopCoverage(osmStops=[],catalog=null,data=null){
 const lineIndex=buildStopLineIndex(catalog);
 const stopTimesById=new Map();
 for(const st of data?.stopTimes||[]){
  const entry=stopTimesById.get(st.stop_id)||{published:0,estimated:0,tripIds:new Set()};
  if(st.timeIsEstimated)entry.estimated++;else entry.published++;
  entry.tripIds.add(st.trip_id);stopTimesById.set(st.stop_id,entry);
 }
 const digitalStopsByName=new Map();
 for(const stop of data?.stops||[]){
  const key=canonicalStopName(stop.stop_name);
  if(!key)continue;
  const list=digitalStopsByName.get(key)||[];
  list.push(stop);digitalStopsByName.set(key,list);
 }
 const rows=(osmStops||[]).map(stop=>{
  const association=stopLineAssociation(stop,lineIndex);
  const keys=equivalentStopKeys(stop.stop_name);
  const digital=[...new Map(keys.flatMap(key=>digitalStopsByName.get(key)||[]).map(s=>[s.stop_id,s])).values()];
  const published=digital.reduce((n,s)=>n+(stopTimesById.get(s.stop_id)?.published||0),0);
  const estimated=digital.reduce((n,s)=>n+(stopTimesById.get(s.stop_id)?.estimated||0),0);
  const lineCount=association.lines.length;
  const status=published?'horarios-publicados-por-nome':estimated?'horarios-estimados-por-nome':
   lineCount?'linha-sem-horario-digital':'sem-linha-documentada';
  return {stopId:stop.stop_id,name:stop.stop_name,lines:association.lines,
   published,estimated,matchingDigitalStopIds:digital.map(s=>s.stop_id),
   status,platformValidated:false};
 });
 const summary={
  total:rows.length,
  withLines:rows.filter(r=>r.lines.length>0).length,
  withPublishedReference:rows.filter(r=>r.published>0).length,
  withEstimatedReference:rows.filter(r=>r.estimated>0).length,
  withoutDocumentedLines:rows.filter(r=>!r.lines.length).length,
  withoutDigitalTimes:rows.filter(r=>!r.published&&!r.estimated).length
 };
 return {summary,rows};
}
