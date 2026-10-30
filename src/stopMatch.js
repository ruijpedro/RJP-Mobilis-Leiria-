// Discovery stops (OpenStreetMap) and verified GTFS stops are kept distinct.
// Only link when position AND name provide strong evidence.
const radians = x => x*Math.PI/180;
export function distanceMeters(a,b){
 const x1=+a.stop_lat,y1=+a.stop_lon,x2=+b.stop_lat,y2=+b.stop_lon;
 if(![x1,y1,x2,y2].every(Number.isFinite))return Infinity;
 const dLat=radians(x2-x1),dLon=radians(y2-y1);
 const h=Math.sin(dLat/2)**2+Math.cos(radians(x1))*Math.cos(radians(x2))*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function normName(name){return (name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function matchingNames(a,b){
 const x=normName(a),y=normName(b);
 if(!x||!y||x==='paragem sem nome'||y==='paragem sem nome')return false;
 if(x===y)return true;
 const tokenize=s=>s.split(' ').filter(w=>w.length>2&&!['paragem','mobilis','leiria','sentido'].includes(w));
 const aa=tokenize(x),bb=tokenize(y);
 return aa.length>0&&bb.length>0&&aa.some(w=>bb.includes(w))&&Math.min(aa.length,bb.length)>=1;
}
export function combineStops(official=[],osm=[]){
 const all=[...official.map(s=>({...s,osm:false}))];
 for(const stop of osm){
  const candidates=official.map(s=>({s,d:distanceMeters(s,stop)})).filter(x=>x.d<=25&&matchingNames(x.s.stop_name,stop.stop_name)).sort((a,b)=>a.d-b.d);
  // Avoid ambiguous associations (two official platforms with the same name nearby).
  if(candidates.length===1){continue;}
  all.push({...stop,osm:true});
 }
 return all;
}

// A possible map/GTFS match must be unique and corroborated by name as well as distance.
// Exposes a testable association for the UI; ambiguous stops remain unverified.
export function matchMappedStop(mapped, official=[]){
 const candidates=official.map(stop=>({stop,distance:distanceMeters(mapped,stop)}))
  .filter(x=>x.distance<=25&&matchingNames(mapped.stop_name,x.stop.stop_name))
  .sort((a,b)=>a.distance-b.distance);
 return candidates.length===1?{stop:candidates[0].stop,distance:candidates[0].distance}:null;
}
