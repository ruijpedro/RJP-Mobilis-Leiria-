import test from 'node:test';
import assert from 'node:assert/strict';
import {walkingDirectionsUrl} from '../src/walking.js';
test('walking route includes stop and authorized GPS origin',()=>{const url=walkingDirectionsUrl({stop_lat:'39.743',stop_lon:'-8.806'},{lat:39.74,lon:-8.8});assert.match(url,/travelmode=walking/);assert.match(url,/origin=/);assert.match(url,/destination=/)});
test('walking route works without GPS and blocks invalid coordinates',()=>{assert.doesNotMatch(walkingDirectionsUrl({stop_lat:39.74,stop_lon:-8.8},null),/origin=/);assert.equal(walkingDirectionsUrl({stop_lat:'x',stop_lon:3},null),null)});
