import {distanceMeters} from './gtfs.js';

// Distância geográfica aproximada: não representa um percurso pedonal validado.
export function buildWalkingTransfers(stops,{maxMeters=350,walkingSpeed=1.1,bufferSeconds=120}={}){
 if(!Number.isFinite(maxMeters)||maxMeters<=0||!Number.isFinite(walkingSpeed)||walkingSpeed<=0||!Number.isFinite(bufferSeconds)||bufferSeconds<0)throw new Error('Parâmetros de transbordo inválidos');
 const valid=(stops||[]).filter(s=>s.stop_id&&s.stop_lat!=null&&s.stop_lon!=null&&String(s.stop_lat).trim()&&String(s.stop_lon).trim()&&Number.isFinite(Number(s.stop_lat))&&Number.isFinite(Number(s.stop_lon))&&Math.abs(Number(s.stop_lat))<=90&&Math.abs(Number(s.stop_lon))<=180);
 const result=new Map();
 const add=(a,b,d)=>{
   const link={from:a.stop_id,to:b.stop_id,distanceMeters:Math.round(d),walkingSeconds:Math.ceil(d*1.3/walkingSpeed),bufferSeconds,estimated:true};
   link.totalSeconds=link.walkingSeconds+bufferSeconds;
   if(!result.has(a.stop_id))result.set(a.stop_id,[]);
   result.get(a.stop_id).push(link);
 };
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
   const a=valid[i],b=valid[j];
   if(a.stop_id===b.stop_id||(a.operatorId||'mobilis')===(b.operatorId||'mobilis'))continue;
   const d=distanceMeters(a,b);
   if(d<=maxMeters){add(a,b,d);add(b,a,d);}
 }
 for(const links of result.values())links.sort((a,b)=>a.totalSeconds-b.totalSeconds);
 return result;
}
