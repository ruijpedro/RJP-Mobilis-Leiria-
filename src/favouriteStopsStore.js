// Favoritos de paragens: IndexedDB persistente com cópia de compatibilidade
// do localStorage da versão anterior. Não são apagados nas atualizações OTA.
const DB='rjp-mobilis-favourites-v1',STORE='preferences',KEY='pinned-stops';
const LEGACY='rjp-favs',BACKUP='rjp-pinned-stops-v1';
const unique=values=>[...new Set((Array.isArray(values)?values:[]).map(x=>String(x||'').trim()).filter(Boolean))];
export function readLegacyFavouriteIds(storage){
 try{return unique(JSON.parse(storage?.getItem(LEGACY)||'[]'))}catch{return []}
}
export function mergeFavouriteIds(...collections){return unique(collections.flatMap(x=>Array.isArray(x)?x:[]))}
function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>resolve(req.result);
 });
}
async function readDb(){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);
  req.onsuccess=()=>resolve(unique(req.result));req.onerror=()=>reject(req.error);
 })}finally{db.close()}
}
async function writeDb(items){
 const db=await openDB();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(items,KEY);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
 })}finally{db.close()}
}
const storage=()=>{try{return typeof localStorage==='undefined'?null:localStorage}catch{return null}};
function readStorage(key){
 try{return unique(JSON.parse(storage()?.getItem(key)||'[]'))}catch{return []}
}
let pendingWrite=Promise.resolve();
export async function loadFavouriteStops(){
 const ids=mergeFavouriteIds(readLegacyFavouriteIds(storage()),readStorage(BACKUP),await readDb().catch(()=>[]));
 // A leitura não regrava automaticamente: evita uma escrita antiga
 // ultrapassar a escolha do utilizador durante o arranque.
 return ids;
}
export function saveFavouriteStops(ids){
 const list=unique(ids),local=storage();
 // Guardar em ambas as chaves para manter compatibilidade com builds antigas.
 try{local?.setItem(LEGACY,JSON.stringify(list));local?.setItem(BACKUP,JSON.stringify(list))}catch{}
 pendingWrite=pendingWrite.catch(()=>{}).then(async()=>{
  try{await writeDb(list)}catch(error){
   if(!local)throw error;
  }
  return list;
 });
 return pendingWrite;
}
