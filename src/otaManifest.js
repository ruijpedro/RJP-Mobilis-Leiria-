export const OTA_APP_ID='pt.rjp.mobilisleiria';
export const OTA_NATIVE_BASE='1.10.17';
export const OTA_MANIFEST_URL='https://raw.githubusercontent.com/ruijpedro/RJP-Mobilis-Leiria-/main/ota/manifest.json';
const ZIP_PREFIX='https://github.com/ruijpedro/RJP-Mobilis-Leiria-/releases/download/';
export function parseVersion(value){
 const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value||''));
 return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null;
}
export function compareVersion(a,b){
 const x=parseVersion(a),y=parseVersion(b);
 if(!x||!y)throw Error('Versão OTA inválida');
 for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);
 return 0;
}
export function verifyOtaManifest(m,currentVersion=OTA_NATIVE_BASE,nativeVersion=OTA_NATIVE_BASE){
 if(!m||m.appId!==OTA_APP_ID||!parseVersion(m.version))throw Error('Manifesto de atualização inválido.');
 if(compareVersion(m.version,currentVersion)<=0)return null;
 if(!parseVersion(m.minNativeVersion)||compareVersion(nativeVersion,m.minNativeVersion)<0)
  throw Error('Esta atualização necessita de uma nova APK assinada.');
 const expected=ZIP_PREFIX+'ota-v'+m.version+'/rjp-mobilis-ota-v'+m.version+'.zip';
 if(m.url!==expected)throw Error('A atualização não está alojada na Release esperada.');
 if(!/^[a-f0-9]{64}$/i.test(m.checksum||''))throw Error('Atualização sem SHA-256 válido.');
 return {version:m.version,url:m.url,checksum:m.checksum};
}
