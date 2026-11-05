import {canonicalStopName} from './stopMatching.js';
import {directoryStopList} from './lineStopDirectory.js';
import {STOP_NAME_EQUIVALENCES} from './stopNameEquivalences.js';

/**
 * Todas as correspondências NOMINAIS entre o catálogo de percursos e as
 * paragens cartografadas. A lista identifica linhas que constam dos percursos,
 * mas não confirma o lado da rua, sentido, frequência ou horário.
 */
export function buildStopLineIndex(catalog){
 const index=new Map();
 for(const stop of directoryStopList(catalog)){
  const key=canonicalStopName(stop.stop_name);
  if(!key||key==='paragem sem nome')continue;
  index.set(key,{lines:[...stop.lines],sources:[...stop.sources]});
 }
 // Acrescentar apenas equivalências específicas observadas em ambas fontes.
 // Não substituir entradas diretas, especialmente se forem plataformas distintas.
 for(const [osmName,catalogName] of STOP_NAME_EQUIVALENCES){
  const from=canonicalStopName(catalogName),to=canonicalStopName(osmName);
  if(!index.has(from)||index.has(to))continue;
  const item=index.get(from);
  index.set(to,{...item,lines:[...item.lines],sources:[...item.sources],aliasOf:catalogName});
 }
 return index;
}
export function stopLineAssociation(stop,index,confirmedLines=[]){
 const key=canonicalStopName(stop?.stop_name);
 const published=(key&&key!=='paragem sem nome'?index.get(key):null);
 const confirmed=[...new Set(confirmedLines.map(l=>String(l.line||l)).filter(Boolean))];
 const listed=published?.lines||[];
 const lines=[...new Set([...confirmed,...listed])].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
 return {lines,confirmed,listed,sources:published?.sources||[],aliasOf:published?.aliasOf||null,status:confirmed.length?'horarios-digitais':listed.length?(published?.aliasOf?'catalogo-equivalencia':'catalogo-nominal'):'sem-correspondencia',
  platformValidated:false};
}
