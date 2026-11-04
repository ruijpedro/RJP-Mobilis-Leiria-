#!/usr/bin/env node
/** Auditoria dos 147 nomes de paragem indicados em percursos Mobilis.
 * Confirma nomes contra OSM e horários, mas nunca certifica a plataforma
 * nem atribui uma hora sem dados do mesmo serviço/sentido.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {canonicalStopName} from '../src/stopMatching.js';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
import {directoryStopList} from '../src/lineStopDirectory.js';

const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const services=[
 'official-verified-schedules.json','official-line1-2026.json','official-line3-2026.json',
 'official-line5-2026.json','official-line6-2026.json'
].flatMap(name=>read(name).services);
const catalog=read('line-stop-directory.json');
const osm=read('osm-stops-leiria.json');
const reference=officialSchedulesToGTFS({schemaVersion:1,services});
const enriched=interpolatePublishedStops(reference,read('published-stop-sequences.json'));
const timedIds=new Set(enriched.stopTimes.map(st=>st.stop_id));
const timedNames=new Set(enriched.stops.filter(s=>timedIds.has(s.stop_id)).map(s=>canonicalStopName(s.stop_name)));
const officialNames=new Set(reference.stops.filter(s=>reference.stopTimes.some(st=>st.stop_id===s.stop_id)).map(s=>canonicalStopName(s.stop_name)));
const osmNames=new Map();
for(const s of osm){
 const name=canonicalStopName(s.stop_name);
 if(name==='paragem sem nome'||!name)continue;
 const arr=osmNames.get(name)||[];
 arr.push({name:s.stop_name,stopId:s.stop_id,lat:s.stop_lat,lon:s.stop_lon,ref:s.ref||null,operator:s.operator||null});
 osmNames.set(name,arr);
}
// Sugestões para revisão humana; nunca usadas para atribuir linhas ou horários.
const common=new Set(['rua','avenida','largo','escola','estrada','rotunda','do','da','de','dos','das','e','x','n','s','1','2']);
const words=value=>[...new Set(canonicalStopName(value).split(' ').filter(w=>w.length>2&&!common.has(w)))];
function suggestions(name){
 const a=words(name);
 if(a.length<2)return [];
 const options=[];
 for(const [key,list] of osmNames){
  if(key===canonicalStopName(name))continue;
  const b=words(key);
  if(b.length<2)continue;
  const overlap=a.filter(w=>b.includes(w)).length;
  const score=overlap/Math.max(a.length,b.length);
  if(score>=0.65&&overlap>=2)options.push({name:list[0].name||key,osmName:key,score:Number(score.toFixed(2)),candidateCount:list.length});
 }
 return options.sort((x,y)=>y.score-x.score||x.osmName.localeCompare(y.osmName,'pt')).slice(0,3);
}
const rows=directoryStopList(catalog).map(x=>{
 const key=canonicalStopName(x.stop_name);
 const times=timedNames.has(key);
 const fromOfficial=officialNames.has(key);
 const matched=osmNames.get(key)||[];
 let status;
 if(fromOfficial)status='referencia_oficial_transcrita';
 else if(times)status='hora_digital_aproximada_ou_transcrita';
 else if(matched.length===1)status='nome_osm_unico_sem_horario';
 else if(matched.length>1)status='nome_osm_multiplas_plataformas';
 else status='sem_correspondencia_osm_exata';
 return {
  name:x.stop_name,linesFromRouteListing:x.lines,status,
  hasDigitalTime:times,hasOfficialReference:fromOfficial,
  osmCandidates:matched,
  possibleOsmNamesToReview:matched.length?[]:suggestions(x.stop_name),
  sources:x.sources,
  // A lista de percursos não comprova orientação nem serviço.
  platformValidated:false,directionValidated:false,
  timeValidated:fromOfficial,
  notes:times?'Há dados digitais sob este nome; a plataforma continua por confirmar.':
   matched.length===1?'Nome igual em um elemento OSM; a paragem e o sentido ainda exigem confirmação.':
   matched.length>1?'Nome comum a várias plataformas; não atribuir horas a nenhuma automaticamente.':
   'Sem nome idêntico nos dados OSM locais; requer fonte geográfica adicional.'
 };
});
const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(x=>x.status===s).length]));
const noTime=rows.filter(x=>!x.hasDigitalTime);
const report={
 generatedFrom:'Ficheiros de fonte versionados no repositório; não é validação de terreno',
 sourceDate:'2026-11-04',
 totalCatalogNames:rows.length,
 withDigitalTimes:rows.length-noTime.length,
 withoutDigitalTimes:noTime.length,
 noTimeOsmSingle:noTime.filter(r=>r.osmCandidates.length===1).length,
 noTimeOsmMultiple:noTime.filter(r=>r.osmCandidates.length>1).length,
 noTimeOsmUnmatched:noTime.filter(r=>!r.osmCandidates.length).length,
 counts,rows
};
if(rows.length!==147||Object.keys(catalog.routes).length!==9)throw Error('Catálogo da rede mudou: rever contagens e validação');
if(rows.some(r=>!r.linesFromRouteListing.length))throw Error('Paragem sem qualquer linha catalogada');
if(process.argv.includes('--write')){
 const dest='docs/paragens-pendentes-auditoria.json';
 mkdirSync('docs',{recursive:true});
 writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
 console.log('Gravado '+dest);
}
console.log(JSON.stringify({
 total:report.totalCatalogNames,timed:report.withDigitalTimes,
 missing:report.withoutDigitalTimes,osmSingle:report.noTimeOsmSingle,
 osmMultiple:report.noTimeOsmMultiple,osmMissing:report.noTimeOsmUnmatched,counts
},null,2));
