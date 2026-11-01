import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync(new URL('../public/data/published-stop-sequences.json',import.meta.url)));
test('Linha 4: 32 posições publicadas, com circular fechado',()=>{const a=d.routes['4'];assert.equal(a.stops.length,32);assert.equal(a.stops[0],a.stops.at(-1));assert.equal(a.completePublishedSequence,true)});
test('Linha 5: excerto é explicitamente incompleto',()=>{const a=d.routes['5'];assert.equal(a.stops.length,15);assert.equal(a.completePublishedSequence,false)});
test('Não inclui passagens simuladas',()=>{for(const a of Object.values(d.routes))assert.equal(a.stop_times,undefined)});
