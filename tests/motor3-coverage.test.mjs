import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {validateOfficialSchedule} from '../src/officialSchedules.js';
const dir=new URL('../public/data/',import.meta.url);
test('all nine lines have validated official reference schedules',()=>{
 const counts=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,{trips:0,days:new Set(),stops:new Set()}]));
 for(const name of readdirSync(dir).filter(n=>/^official-(line\d+-2026|verified-schedules)\.json$/.test(n))){
  const payload=JSON.parse(readFileSync(new URL(name,dir),'utf8'));
  for(const s of validateOfficialSchedule(payload)){
   const c=counts[s.line];c.trips++;c.days.add(s.days);for(const stop of s.stops)c.stops.add(stop.stopId);
  }
 }
 for(const [line,c] of Object.entries(counts)){
  console.log('Line '+line+': '+c.trips+' reference trips, '+c.stops.size+' stop IDs; '+[...c.days].join(','));
  assert.ok(c.trips>0,'Missing reference schedules for line '+line);
 }
});
