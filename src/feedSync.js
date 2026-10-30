import {importGTFS} from './gtfs.js';
export const FEED_URL_KEY='rjp-mobilis-gtfs-url';
export function validateFeedURL(raw){
 const value=String(raw||'').trim();
 if(!value)throw Error('Indica o endereço HTTPS do ficheiro GTFS ZIP.');
 let url;try{url=new URL(value)}catch{throw Error('Endereço inválido. Usa um URL HTTPS completo.');}
 if(url.protocol!=='https:')throw Error('Por segurança, a fonte GTFS deve utilizar HTTPS.');
 if(url.username||url.password)throw Error('Não coloques credenciais no endereço da fonte.');
 return url.toString();
}
export async function fetchGTFS(url,{fetcher=fetch,maxBytes=30_000_000}={}){
 const address=validateFeedURL(url);
 const response=await fetcher(address,{cache:'no-store',redirect:'follow'});
 if(!response.ok)throw Error(`Não foi possível descarregar o GTFS (HTTP ${response.status}).`);
 const length=Number(response.headers?.get?.('content-length')||0);
 if(length>maxBytes)throw Error('Ficheiro demasiado grande (limite 30 MB).');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength>maxBytes)throw Error('Ficheiro demasiado grande (limite 30 MB).');
 if(bytes.byteLength<4||new Uint8Array(bytes)[0]!==0x50||new Uint8Array(bytes)[1]!==0x4b)throw Error('A fonte não devolveu um ficheiro ZIP GTFS.');
 const blob=new Blob([bytes],{type:'application/zip'});
 const data=await importGTFS(blob);
 return {...data,source:address};
}
