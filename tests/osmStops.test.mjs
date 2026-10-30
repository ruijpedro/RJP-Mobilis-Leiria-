import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOsmStops} from '../src/osmStops.js';
test('OSM stops are identified without fabricated schedules',()=>{
 const result=parseOsmStops({elements:[{type:'node',id:42,lat:39.74,lon:-8.8,tags:{highway:'bus_stop',name:'Exemplo'}},{type:'node',id:43,lat:39.74,lon:-8.8,tags:{shop:'yes'}}]});
 assert.equal(result.length,1);assert.equal(result[0].stop_name,'Exemplo');assert.equal(result[0].osm,true);assert.equal(result[0].stopTimes,undefined);
});
