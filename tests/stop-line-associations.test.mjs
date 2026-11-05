import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildStopLineIndex,stopLineAssociation} from '../src/stopLineAssociations.js';
const read=f=>JSON.parse(readFileSync(new URL('../public/data/'+f,import.meta.url),'utf8'));
const catalog=read('line-stop-directory.json');
const osm=read('osm-stops-leiria.json');
const index=buildStopLineIndex(catalog);
test('todas as designações dos nove percursos são indexadas sem duplicar linhas',()=>{
 assert.equal(index.size,147);
 assert.ok([...index.values()].every(x=>x.lines.length>0&&new Set(x.lines).size===x.lines.length));
});
test('linhas digitais e catálogo são unidos, sem ocultar linhas identificadas apenas no percurso',()=>{
 const a=stopLineAssociation({stop_name:'Bairro das Almoínhas'},index,[{line:'9'}]);
 const published=index.get('bairro das almoinhas').lines;
 assert.deepEqual(a.lines,[...new Set([...published,'9'])].sort((x,y)=>x.localeCompare(y,'pt',{numeric:true})));
 assert.equal(a.platformValidated,false);
});
test('paragens sem nome e Piscinas não recebem linhas fictícias',()=>{
 assert.deepEqual(stopLineAssociation({stop_name:'Paragem sem nome'},index).lines,[]);
 const piscinas=stopLineAssociation({stop_name:'Piscinas Municipais'},index);
 assert.deepEqual(piscinas.lines,[]);
});
test('associação nominal abrange paragens OSM sem converter esse facto em validação de plataforma',()=>{
 const associated=osm.map(s=>stopLineAssociation(s,index)).filter(x=>x.lines.length);
 assert.ok(associated.length>=100);
 assert.ok(associated.every(x=>x.platformValidated===false));
 assert.equal(osm.length,293);
});
