import test from 'node:test';import assert from 'node:assert/strict';import {officialDepartures,OFFICIAL_LINES,VIDIGAL_L7} from '../src/official.js';
test('linhas oficiais 1 a 9 e PDF Linha 7',()=>{assert.equal(OFFICIAL_LINES.length,9);assert.equal(VIDIGAL_L7.weekdays.length,10)});
test('sábado e dias úteis têm horários diferentes',()=>{assert.equal(officialDepartures(new Date('2026-10-31T12:00:00')).length,3);assert.equal(officialDepartures(new Date('2026-10-30T12:00:00')).length,10)});
