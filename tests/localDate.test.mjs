import test from 'node:test';import assert from 'node:assert/strict';import {localServiceDate,hasUsableTrips} from '../src/localDate.js';
test('a data usa calendario local e nao ISO UTC',()=>{assert.equal(localServiceDate(new Date(2026,9,30,23,45)), '2026-10-30')});
test('uma passagem isolada nao permite calcular viagem',()=>{assert.equal(hasUsableTrips({trips:[{trip_id:'t'}],stopTimes:[{trip_id:'t',stop_id:'a',departure_time:'07:00:00'}]}),false)});
test('duas paragens da mesma viagem permitem calculo',()=>{assert.equal(hasUsableTrips({trips:[{trip_id:'t'}],stopTimes:[{trip_id:'t',stop_id:'a',departure_time:'07:00:00'},{trip_id:'t',stop_id:'b',departure_time:'07:10:00'}]}),true)});
