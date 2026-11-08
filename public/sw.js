/* RJP Mobilis Leiria WebApp: cache conservadora do shell.
   Dados de horários: network-first; nunca declarar cache como tempo real. */
const CACHE='rjp-mobilis-web-v1';
const BASE=new URL(self.registration.scope).pathname;
const SHELL=[BASE,BASE+'index.html',BASE+'manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rjp-mobilis-web-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(BASE+'index.html',copy))}return response}).catch(()=>caches.match(BASE+'index.html')));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok&&['script','style','image','font'].includes(req.destination)){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return response})));
});
