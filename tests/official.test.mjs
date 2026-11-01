import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICIAL_LINES,getLine,parseManifest} from '../src/official.js';
test('catálogo contém as nove linhas e links oficiais',()=>{
 assert.equal(OFFICIAL_LINES.length,9);
 assert.equal(getLine(7).id,'7');
 assert.ok(getLine('7').url.endsWith('/linha-7/'));
});
test('manifesto de fontes não aceita domínios externos e não é convertido em horários',()=>{
 const lines=parseManifest({lines:[{id:'7',page:'https://mobilis.pt/linhas/linha-7/'},{id:'7',page:'https://outro.test/'}]});
 assert.equal(lines.length,1);
 assert.equal(parseManifest({lines:null}).length,0);
});
