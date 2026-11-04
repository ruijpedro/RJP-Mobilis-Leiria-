import test from 'node:test';
import assert from 'node:assert/strict';
import {matchMappedStop,linesAtStop} from '../src/stopMatching.js';

const osm={stop_name:'Campo Amarelo',stop_lat:'39.745',stop_lon:'-8.805'};
test('associa por nome e coordenadas quando o candidato é único',()=>{
 const result=matchMappedStop(osm,[{stop_id:'a',stop_name:'Campo Amarelo',stop_lat:'39.7451',stop_lon:'-8.805'}]);
 assert.equal(result.status,'position');assert.equal(result.stop.stop_id,'a');
});
test('não resolve plataformas com posição ambígua',()=>{
 const stops=[{stop_id:'a',stop_name:'Campo Amarelo',stop_lat:'39.7451',stop_lon:'-8.805'},{stop_id:'b',stop_name:'Campo Amarelo',stop_lat:'39.7452',stop_lon:'-8.805'}];
 const result=matchMappedStop(osm,stops);
 assert.equal(result.status,'ambiguous');assert.equal(result.stop,null);
});
test('nome único sem coordenadas fica marcado como não confirmado espacialmente',()=>{
 const result=matchMappedStop(osm,[{stop_id:'a',stop_name:'Campo Amarelo',stop_lat:'',stop_lon:''}]);
 assert.equal(result.status,'name-only');
});
test('não atribui horários só por proximidade sem nome correspondente',()=>{
 const result=matchMappedStop(osm,[{stop_id:'b',stop_name:'Rua Diferente',stop_lat:'39.745',stop_lon:'-8.805'}]);
 assert.equal(result.status,'unmatched');
});
test('lista apenas linhas documentadas na paragem',()=>{
 const data={stopTimes:[{stop_id:'a',trip_id:'t7'},{stop_id:'b',trip_id:'t8'}],trips:[{trip_id:'t7',route_id:'r7'},{trip_id:'t8',route_id:'r8'}],routes:[{route_id:'r7',route_short_name:'7'},{route_id:'r8',route_short_name:'8'}]};
 assert.deepEqual(linesAtStop(data,'a').map(l=>l.line),['7']);
});

test('associa abreviatura Avenida à forma Av. sem adivinhar a plataforma',()=>{
 const osm={stop_name:'Avenida Marquês de Pombal',stop_lat:'39.739',stop_lon:'-8.806'};
 const result=matchMappedStop(osm,[{stop_id:'m',stop_name:'Av. Marquês de Pombal',stop_lat:'',stop_lon:''}]);
 assert.equal(result.status,'name-only');
 assert.equal(result.stop.stop_id,'m');
});
test('não associa nomes parecidos que designam paragens distintas',()=>{
 const osm={stop_name:'Av. Bernardo Pimenta (Estádio)',stop_lat:'39.74',stop_lon:'-8.8'};
 const result=matchMappedStop(osm,[{stop_id:'m',stop_name:'Av. Bernardo Pimenta (Terminal)',stop_lat:'',stop_lon:''}]);
 assert.equal(result.status,'unmatched');
});
