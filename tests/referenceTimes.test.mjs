import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCE_TIMES,canRouteFromReference} from '../src/referenceTimes.js';
test('referência externa nunca é promovida a percurso sem validação',()=>{
 assert.equal(REFERENCE_TIMES.line,'7');
 assert.deepEqual(REFERENCE_TIMES.passages,['07:17','08:07']);
 assert.equal(canRouteFromReference(REFERENCE_TIMES),false);
 assert.equal(canRouteFromReference({...REFERENCE_TIMES,verifiedAgainstOfficial:true}),false);
});
