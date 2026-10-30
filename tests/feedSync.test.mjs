import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFeedURL,fetchGTFS} from '../src/feedSync.js';
test('exige HTTPS e rejeita URLs com credenciais',()=>{
 assert.equal(validateFeedURL(' https://example.org/feed.zip '),'https://example.org/feed.zip');
 assert.throws(()=>validateFeedURL('http://example.org/feed.zip'),/HTTPS/);
 assert.throws(()=>validateFeedURL('https://user:pass@example.org/feed.zip'),/credenciais/);
});
test('rejeita respostas HTTP falhadas sem alterar dados',async()=>{
 await assert.rejects(fetchGTFS('https://example.org/feed.zip',{fetcher:async()=>({ok:false,status:404})}),/HTTP 404/);
});
test('rejeita ficheiros que não sejam ZIP',async()=>{
 await assert.rejects(fetchGTFS('https://example.org/feed.zip',{fetcher:async()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>new TextEncoder().encode('not zip').buffer})}),/ZIP/);
});
