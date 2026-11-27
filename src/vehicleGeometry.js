// Coordinates in Leaflet order. Match only one continuous, unambiguous segment.
const distance=(a,b)=>Math.hypot((a[0]-b[0])*111000,(a[1]-b[1])*86000);
function project(p,points){
 let best=null;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dy=(b[0]-a[0])*111000,dx=(b[1]-a[1])*86000;
  const den=dy*dy+dx*dx;if(!den)continue;
  const f=Math.max(0,Math.min(1,((p[0]-a[0])*111000*dy+(p[1]-a[1])*86000*dx)/den));
  const q=[a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])],error=distance(p,q);
  if(!best||error<best.error)best={i,f,q,error};
 }
 return best;
}
export function matchVehiclePath(a,b,line,routes=[]){
 if(!a||!b||distance(a,b)<10)return null;
 const matches=[];
 for(const route of routes){
  if(String(route.ref||'').replace(/^linha\s+/i,'').trim()!==String(line))continue;
  for(const points of route.shape_segments||[]){
   if(!Array.isArray(points)||points.length<2||!points.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)))continue;
   const x=project(a,points),y=project(b,points);
   if(!x||!y||x.error>40||y.error>40||x.i+x.f>y.i+y.f)continue;
   const path=[x.q,...points.slice(x.i,y.i),y.q];
   const length=path.slice(1).reduce((n,p,i)=>n+distance(path[i],p),0);
   if(length<10||length>Math.max(250,distance(a,b)*3))continue;
   matches.push(path);
  }
 }
 return matches.length===1?matches[0]:null;
}
export function pointOnVehiclePath(path,f){
 if(!path||path.length<2)return null;
 const lengths=path.slice(1).map((p,i)=>distance(path[i],p));
 let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,f));
 for(let i=0;i<lengths.length;i++){
  if(!lengths[i])continue;
  if(remaining<=lengths[i]){const t=remaining/lengths[i];return path[i].map((v,j)=>v+t*(path[i+1][j]-v));}
  remaining-=lengths[i];
 }
 return path.at(-1);
}
