import {Capacitor} from '@capacitor/core';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import {OTA_NATIVE_BASE,OTA_MANIFEST_URL,verifyOtaManifest} from './otaManifest.js';
export const nativeOtaAvailable=()=>Capacitor.isNativePlatform();
export async function otaReady(){
 if(!nativeOtaAvailable())return;
 await CapacitorUpdater.notifyAppReady();
}
export async function checkAndPrepareOta(onStatus=()=>{}){
 if(!nativeOtaAvailable())return {status:'web'};
 onStatus('A verificar atualizações OTA…');
 const current=await CapacitorUpdater.current();
 const reportedVersion=current?.bundle?.version;
 // O plugin pode devolver um identificador interno, e não uma versão semântica.
 // O bundle nativo deve ser identificado pela versão da APK; não comparar IDs.
 const installed=/^v?\d+\.\d+\.\d+$/.test(String(reportedVersion||''))
  ?String(reportedVersion).replace(/^v/,''):OTA_NATIVE_BASE;
 const response=await fetch(OTA_MANIFEST_URL,{cache:'no-store'});
 if(!response.ok)throw Error('Não foi possível consultar o manifesto OTA ('+response.status+').');
 const manifest=await response.json();
 const update=verifyOtaManifest(manifest,installed,OTA_NATIVE_BASE);
 if(!update){onStatus('A aplicação está atualizada.');return {status:'current',installed};}
 onStatus('A descarregar atualização '+update.version+'…');
 // O plugin verifica o checksum SHA-256 antes de instalar o pacote.
 const bundle=await CapacitorUpdater.download(update);
 if(!bundle?.id)throw Error('O descarregamento OTA não devolveu um pacote válido.');
 await CapacitorUpdater.next({id:bundle.id});
 onStatus('Atualização '+update.version+' preparada. Fecha e volta a abrir a aplicação.');
 return {status:'prepared',version:update.version};
}
