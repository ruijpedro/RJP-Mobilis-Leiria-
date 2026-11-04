import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialSchedulesToGTFS} from '../src/officialSchedules.js';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const raw=[
 ...read('official-verified-schedules.json').services,
 ...read('official-line1-2026.json').services,
 ...read('official-line3-2026.json').services,
 ...read('official-line5-2026.json').services,
 ...read('official-line6-2026.json').services
];
const selected=raw.filter(service=>['1','5','6','7','8'].includes(service.line));
const data=officialSchedulesToGTFS({schemaVersion:1,services:selected});
const published=read('published-stop-sequences.json');
const osm=read('osm-stops-leiria.json');
const enriched=interpolatePublishedStops(data,published,{osmStops:osm});
const trips=new Map(enriched.trips.map(t=>[t.trip_id,t]));
const routes=new Map(enriched.routes.map(r=>[r.route_id,r.route_short_name]));
const countByLine=line=>enriched.stopTimes.filter(st=>st.timeIsEstimated&&routes.get(trips.get(st.trip_id).route_id)===line).length;
test('cinco linhas possuem ao menos um troço com progressão sem extrapolação',()=>{
 for(const line of ['1','5','6','7','8'])assert.ok(countByLine(line)>0,'linha '+line);
});
test('não duplica viagens nem altera horas oficiais',()=>{
 assert.equal(enriched.trips.length,data.trips.length);
 for(const trip of data.trips){
  const original=data.stopTimes.filter(st=>st.trip_id===trip.trip_id);
  const actual=enriched.stopTimes.filter(st=>st.trip_id===trip.trip_id&&!st.timeIsEstimated);
  assert.deepEqual(actual.map(s=>[s.stop_id,s.departure_time]),
                   original.map(s=>[s.stop_id,s.departure_time]));
 }
});
test('sentido de regresso da linha 6 não é interpolado com rota só de ida',()=>{
 const returning=new Set(selected.filter(s=>s.line==='6'&&s.direction.includes('→ Leiria')).map(s=>s.id));
 // Os IDs de trip GTFS foram gerados por índice da seleção.
 for(const [index,service] of selected.entries())if(returning.has(service.id))
   assert.equal(enriched.stopTimes.filter(st=>st.trip_id==='official-trip-'+index&&st.timeIsEstimated).length,0);
});
test('nunca atribui estimativa fora das âncoras oficiais da mesma viagem',()=>{
 for(const trip of data.trips){
  const stops=enriched.stopTimes.filter(s=>s.trip_id===trip.trip_id).sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
  for(let i=0;i<stops.length;i++)if(stops[i].timeIsEstimated){
   let left=i-1,right=i+1;
   while(left>=0&&stops[left].timeIsEstimated)left--;
   while(right<stops.length&&stops[right].timeIsEstimated)right++;
   assert.ok(left>=0&&right<stops.length,trip.trip_id);
   assert.ok(stops[i].departure_time>=stops[left].departure_time);
   assert.ok(stops[i].departure_time<=stops[right].departure_time);
  }
 }
});
