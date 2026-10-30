import test from 'node:test';
import assert from 'node:assert/strict';
import {lineCoverage,networkReady} from '../src/lineCoverage.js';
test('No feed is no confirmed timetable',()=>{assert.deepEqual(lineCoverage(null),[]);assert.equal(networkReady(null),false)});
test('One isolated time is not a route',()=>{const d={routes:[{route_id:'r',route_short_name:'7'}],trips:[{route_id:'r',trip_id:'t'}],stops:[{stop_id:'a'},{stop_id:'b'}],stopTimes:[{trip_id:'t',stop_id:'a',departure_time:'07:00:00'}],calendar:[{}]};assert.equal(lineCoverage(d)[0].journeys,0);assert.equal(networkReady(d),false)});
test('Two valid distinct stops and service calendar produce coverage',()=>{const d={routes:[{route_id:'r',route_short_name:'7'}],trips:[{route_id:'r',trip_id:'t'}],stops:[{stop_id:'a'},{stop_id:'b'}],stopTimes:[{trip_id:'t',stop_id:'a',departure_time:'07:00:00'},{trip_id:'t',stop_id:'b',departure_time:'07:15:00'}],calendar:[{}]};assert.equal(lineCoverage(d)[0].stops,2);assert.equal(networkReady(d),true)});
