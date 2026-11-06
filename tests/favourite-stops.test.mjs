import test from 'node:test';
import assert from 'node:assert/strict';
import {readLegacyFavouriteIds,mergeFavouriteIds} from '../src/favouriteStopsStore.js';
test('recupera atalhos de versões anteriores sem os duplicar',()=>{
 const storage={getItem:key=>key==='rjp-favs'?JSON.stringify(['osm:1','gtfs:2','osm:1']):null};
 assert.deepEqual(readLegacyFavouriteIds(storage),['osm:1','gtfs:2']);
 assert.deepEqual(mergeFavouriteIds(['osm:1'],['gtfs:2','osm:1']),['osm:1','gtfs:2']);
});
test('dados locais danificados não impedem arranque da aplicação',()=>{
 const storage={getItem:()=>'{incompleto'};
 assert.deepEqual(readLegacyFavouriteIds(storage),[]);
 assert.deepEqual(mergeFavouriteIds(null,[],['osm:10']),['osm:10']);
});
test('IDs de paragens OSM são preservados sem transformação',()=>{
 assert.deepEqual(mergeFavouriteIds(['osm:node:2725114760'],['osm:node:3284997886']),['osm:node:2725114760','osm:node:3284997886']);
});
