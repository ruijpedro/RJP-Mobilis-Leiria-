import {fetchGTFS,validateFeedURL} from './feedSync.js';
import {loadData,saveData} from './store.js';
// No Android, os assets do pacote não mudam após a instalação.
// Definir VITE_MOBILIS_CATALOG_URL para apontar para o catálogo HTTPS publicado.
const INDEX_PATH=import.meta.env?.VITE_MOBILIS_CATALOG_URL || '/data/mobilis-sources.json';
const LAST_CHECK='rjp-mobilis-last-check-v17';
const INTERVAL=6*60*60*1000;
export function validateIndex(obj){
 if(!obj||obj.network!=='Mobilis Leiria'||!Array.isArray(obj.officialLines)||obj.officialLines.length<9)throw Error('Catálogo de fontes inválido.');
 if(obj.feedUrl)validateFeedURL(obj.feedUrl);
 return obj;
}
export async function refreshOfficialIndex({fetcher=fetch}={}){
 const response=await fetcher(INDEX_PATH,{cache:'no-store'});
 if(!response.ok)throw Error('Catálogo de fontes indisponível.');
 return validateIndex(await response.json());
}
export async function autoUpdate({force=false,onStatus=()=>{},fetcher=fetch,storage=localStorage,indexLoader=refreshOfficialIndex,feedLoader=fetchGTFS,load=loadData,save=saveData,now=()=>Date.now()}={}){
 const previous=await load().catch(()=>null);
 const last=Number(storage.getItem(LAST_CHECK)||0);
 if(!force&&previous&&now()-last<INTERVAL){onStatus('Horários guardados disponíveis offline.');return previous;}
 let index;
 try {index=await indexLoader({fetcher});}
 catch {onStatus(previous?'Sem ligação à atualização; mantidos os horários guardados.':'Sem ligação à fonte de horários; consulta as páginas oficiais.');return previous;}
 storage.setItem(LAST_CHECK,String(now()));
 if(!index.feedUrl){onStatus(previous?'Sem novo GTFS confirmado; conservada a última versão.':'Fonte GTFS completa ainda não publicada; consulta os horários oficiais.');return previous;}
 if(index.feedUrl===previous?.source&&!force){onStatus('Base de horários guardada e disponível offline.');return previous;}
 try {const data=await feedLoader(index.feedUrl,{fetcher});await save(data);onStatus('Horários oficiais sincronizados e disponíveis offline.');return data;}
 catch {onStatus(previous?'A atualização falhou; mantidos os horários anteriores.':'Fonte de horários temporariamente indisponível.');return previous;}
}
