import {Capacitor} from '@capacitor/core';
import pkg from '../package.json';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import {OTA_NATIVE_BASE,OTA_MANIFEST_URL,verifyOtaManifest} from './otaManifest.js';

// O canal OTA é gerido pela WebApp; não altera o plugin nativo nem a assinatura.
// Verificações automáticas são espaçadas para poupar rede e bateria.
const AUTO_CHECK_INTERVAL_MS=10*60*1000;
let lastAutomaticCheck=0;
let pendingCheck=null;
let preparedVersion=null;

export const nativeOtaAvailable=()=>Capacitor.isNativePlatform();
export async function otaReady(){
 if(!nativeOtaAvailable())return;
 await CapacitorUpdater.notifyAppReady();
}
export function checkAndPrepareOta(onStatus=()=>{}, {automatic=false}={}){
 if(!nativeOtaAvailable())return Promise.resolve({status:'web'});
 if(pendingCheck)return pendingCheck;
 const now=Date.now();
 if(automatic&&now-lastAutomaticCheck<AUTO_CHECK_INTERVAL_MS)
  return Promise.resolve({status:'throttled'});
 if(automatic)lastAutomaticCheck=now;
 pendingCheck=(async()=>{
  if(!automatic)onStatus('A verificar atualizações…');
  const current=await CapacitorUpdater.current();
  const reportedVersion=current?.bundle?.version;
  // current().bundle.version pode ser um ID interno; nesse caso a versão
  // do código Web instalado é a referência semântica segura.
  const installed=/^v?\d+\.\d+\.\d+$/.test(String(reportedVersion||''))
   ?String(reportedVersion).replace(/^v/,''):pkg.version;
  const response=await fetch(OTA_MANIFEST_URL,{cache:'no-store'});
  if(!response.ok)throw Error('Não foi possível consultar o manifesto OTA ('+response.status+').');
  const manifest=await response.json();
  const update=verifyOtaManifest(manifest,installed,OTA_NATIVE_BASE);
  if(!update){
   if(!automatic)onStatus('A aplicação está atualizada.');
   return {status:'current',installed};
  }
  if(preparedVersion===update.version){
   if(!automatic)onStatus('Atualização '+update.version+' já preparada para o próximo arranque.');
   return {status:'prepared',version:update.version};
  }
  onStatus('Nova atualização '+update.version+' encontrada. A descarregar automaticamente…');
  const bundle=await CapacitorUpdater.download(update);
  if(!bundle?.id)throw Error('O descarregamento OTA não devolveu um pacote válido.');
  await CapacitorUpdater.next({id:bundle.id});
  preparedVersion=update.version;
  onStatus('Atualização '+update.version+' descarregada. Será aplicada automaticamente ao fechar e voltar a abrir a aplicação.');
  return {status:'prepared',version:update.version};
 })().finally(()=>{pendingCheck=null});
 return pendingCheck;
}
