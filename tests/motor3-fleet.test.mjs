import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {interpolatePublishedStops} from '../src/interpolateStopTimes.js';
import {officialSchedulesToGTFS,mergeOfficialGTFS} from '../src/officialSchedules.js';
import {buildEstimatedVehicleIndex,estimatedVehicles} from '../src/estimatedVehicles.js';
const dir=new URL('../public/data/',import.meta.url);
const read=n=>JSON.parse(readFileSync(new URL(n,dir),'utf8'));
test('fleet coverage by line and service day',()=>{
 const services=readdirSync(dir).filter(n=>/^official-(line\d+-2026|verified-schedules)\.json$/.test(n)).flatMap(n=>read(n).services);
 const official=officialSchedulesToGTFS({schemaVersion:1,services});
 const raw=read('osm-stops-leiria.json'),net=read('osm-network.json');
 const stops=Array.isArray(raw)?raw:raw.stops||raw.elements||[];
 const routes=Array.isArray(net)?net:net.routes||[];
 const data=interpolatePublishedStops(mergeOfficialGTFS(read('mobilis-sample.json'),official),read('published-stop-sequences.json'),{osmStops:stops});
 const index=buildEstimatedVehicleIndex(data,stops,routes);
 for(const line of ['3','5','6','7','8']){const missing=new Map();for(const t of index.filter(t=>String(t.route?.route_short_name)===line))for(const row of t.rows)if(!row.point)missing.set(row.name,(missing.get(row.name)||0)+1);console.log('Missing anchors line '+line+': '+JSON.stringify([...missing].sort((a,b)=>b[1]-a[1]).slice(0,30)));}
 console.log('Coordinate anchors:',index.reduce((n,t)=>n+t.rows.filter(r=>r.point).length,0));
 for(const date of ['2026-11-27','2026-11-28','2026-11-29']){
 const stats=Array.from({length:9},()=>({scheduled:0,mapped:0,peak:0}));
 for(let minute=360;minute<1440;minute+=15){
 const d={},now=new Date(date+'T'+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0')+':00Z');
 estimatedVehicles(index,data,now,d);
 for(let i=0;i<9;i++){const x=d[i+1]||{};stats[i].scheduled+=x.scheduled||0;stats[i].mapped+=x.mapped||0;stats[i].peak=Math.max(stats[i].peak,x.mapped||0);}
 }
 console.log(date,JSON.stringify(stats.map((s,i)=>({line:i+1,...s}))));
 }
});
