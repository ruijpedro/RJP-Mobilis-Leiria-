import test from 'node:test';
import assert from 'node:assert/strict';
import {timetableFromTime,countTimetableDepartures} from '../src/stopTimetableView.js';
const groups=[
 {line:'7',direction:'Vidigal',sources:['https://mobilis.pt/'],departures:[{time:'08:00:00',tripId:'a',estimated:false},{time:'09:30:00',tripId:'b',estimated:true}]},
 {line:'10',direction:'Centro',sources:[],departures:[{time:'09:45:00',tripId:'c',estimated:false}]}
];
test('mostra apenas passagens à hora ou posteriores na data selecionada',()=>{
 const result=timetableFromTime(groups,new Date(2026,10,5,9,30));
 assert.deepEqual(result.map(g=>g.departures.map(x=>x.time)),[['09:30:00'],['09:45:00']]);
 assert.equal(result[0].departures[0].estimated,true);
 assert.equal(result[0].direction,'Vidigal');
 assert.deepEqual(result[0].sources,['https://mobilis.pt/']);
});
test('o dia completo mantém todas as passagens e sentidos',()=>{
 const result=timetableFromTime(groups,new Date(2026,10,5,23,45),{allDay:true});
 assert.equal(countTimetableDepartures(result),3);
 assert.equal(groups[0].departures.length,2);
});
test('sem mais passagens não inventa uma próxima partida',()=>{
 assert.deepEqual(timetableFromTime(groups,new Date(2026,10,5,22,0)),[]);
 assert.equal(countTimetableDepartures([]),0);
});
