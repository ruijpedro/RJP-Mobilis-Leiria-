import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVersion,compareVersion,verifyOtaManifest,OTA_APP_ID,OTA_NATIVE_BASE} from '../src/otaManifest.js';
const base=JSON.parse(readFileSync(new URL('../ota/manifest.json',import.meta.url),'utf8'));
const manifest=version=>({
 appId:OTA_APP_ID,version,minNativeVersion:OTA_NATIVE_BASE,
 url:'https://github.com/ruijpedro/RJP-Mobilis-Leiria-/releases/download/ota-v'+version+'/rjp-mobilis-ota-v'+version+'.zip',
 checksum:'a'.repeat(64)
});
test('manifesto publicado é aceite e não repete a versão instalada',()=>{
 assert.equal(base.appId,OTA_APP_ID);
 assert.equal(base.minNativeVersion,OTA_NATIVE_BASE);
 assert.ok(compareVersion(base.version,OTA_NATIVE_BASE)>=0);
 assert.equal(verifyOtaManifest(base,base.version),null);
 if(compareVersion(base.version,OTA_NATIVE_BASE)>0)assert.equal(verifyOtaManifest(base,OTA_NATIVE_BASE).version,base.version);
});
test('versões OTA usam comparação semântica e não comparação textual',()=>{
 assert.deepEqual(parseVersion('v1.10.17'),[1,10,17]);
 assert.equal(compareVersion('1.10.18','1.10.17'),1);
 assert.equal(compareVersion('1.10.9','1.10.17'),-1);
 assert.equal(compareVersion('1.11.0','1.10.99'),1);
});
test('OTA válida deve vir da Release exata com SHA-256',()=>{
 assert.equal(verifyOtaManifest(manifest('1.10.18')).version,'1.10.18');
 assert.equal(verifyOtaManifest(manifest('1.10.18'),'1.10.18'),null);
 assert.throws(()=>verifyOtaManifest({...manifest('1.10.18'),checksum:'incorrect'}),/SHA-256/);
 assert.throws(()=>verifyOtaManifest({...manifest('1.10.18'),url:'https://evil.example.com/update.zip'}),/Release esperada/);
 assert.throws(()=>verifyOtaManifest({...manifest('1.10.18'),appId:'pt.other.app'}),/inválido/);
});
test('alterações nativas incompatíveis não podem chegar pela OTA',()=>{
 assert.throws(()=>verifyOtaManifest({...manifest('1.10.18'),minNativeVersion:'1.10.18'}),/nova APK/);
});
