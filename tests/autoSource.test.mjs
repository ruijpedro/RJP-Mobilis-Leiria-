import test from 'node:test';import assert from 'node:assert/strict';
import {autoUpdate,validateIndex} from '../src/autoSource.js';
const index={network:'Mobilis Leiria',officialLines:Array.from({length:9},(_,i)=>({number:i+1})),feedUrl:'https://example.org/gtfs.zip'};
test('rejeita catálogo inválido',()=>assert.throws(()=>validateIndex({}),/inválido/));
test('sincroniza automaticamente e guarda horários',async()=>{
 let saved=null;const storage={getItem:()=>null,setItem:()=>{}};
 const d=await autoUpdate({force:true,storage,indexLoader:async()=>index,feedLoader:async()=>({source:index.feedUrl,stops:[1]}),load:async()=>null,save:async x=>saved=x});
 assert.deepEqual(d,saved);assert.equal(saved.stops.length,1);
});
test('quando rede falha conserva cache',async()=>{
 const old={source:'anterior'};const d=await autoUpdate({force:true,storage:{getItem:()=>null,setItem:()=>{}},indexLoader:async()=>{throw Error('offline')},load:async()=>old});assert.deepEqual(d,old);
});
test('sem feed confirmado não inventa dados',async()=>{
 const d=await autoUpdate({force:true,storage:{getItem:()=>null,setItem:()=>{}},indexLoader:async()=>({...index,feedUrl:null}),load:async()=>null});assert.equal(d,null);
});
