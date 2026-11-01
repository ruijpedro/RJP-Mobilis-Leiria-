import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';
initializeApp();const db=getFirestore();
const rad=x=>x*Math.PI/180;
function metres(a,b,c,d){const h=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(h)))}
function localParts(now){const x=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return {localDate:`${x.year}-${x.month}-${x.day}`,dayType:x.weekday==='Sat'?'sabado':x.weekday==='Sun'?'domingo':'util',minuteOfDay:Number(x.hour)*60+Number(x.minute)}}
export const submitObservedPassage=onCall({region:'europe-west1',enforceAppCheck:true,maxInstances:10,timeoutSeconds:30},async(req)=>{
 if(!req.auth?.uid)throw new HttpsError('unauthenticated','Autenticação necessária');
 const {stopId,line,direction='',latitude,longitude}=req.data||{};
 if(typeof stopId!=='string'||stopId.length>60||!stopId||typeof line!=='string'||line.length>10||!line||typeof direction!=='string'||direction.length>40||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new HttpsError('invalid-argument','Dados inválidos');
 // Coordinates of stops must be validated/imported by admin, not from the client.
 const s=await db.collection('verifiedStops').doc(stopId).get();if(!s.exists)throw new HttpsError('failed-precondition','Paragem ainda não validada para registos');
 const stop=s.data();const d=metres(Number(stop.lat),Number(stop.lon),latitude,longitude);if(!Number.isFinite(d)||d>75)throw new HttpsError('permission-denied','Fora do raio permitido');
 // GPS can be spoofed: distance is checked against trusted stop coords, not proof of physical presence.
 const now=new Date();const part=localParts(now),uid=req.auth.uid;
 const rate=db.collection('crowdRateLimits').doc(uid),record=db.collection('observations').doc();
 await db.runTransaction(async tx=>{const before=await tx.get(rate),old=before.exists?before.data():{};const ms=old.lastAt?.toMillis?.()||0;const today=old.localDate===part.localDate?(old.count||0):0;if(now.getTime()-ms<5*60*1000||today>=12)throw new HttpsError('resource-exhausted','Limite de registos atingido');tx.set(rate,{lastAt:Timestamp.fromDate(now),localDate:part.localDate,count:today+1});tx.create(record,{stopId,line,direction,...part,nearMeters:Math.round(d),uid,createdAt:FieldValue.serverTimestamp()})});
 return {accepted:true,notice:'Observação recebida, ainda não confirmada. Não é localização em tempo real.'};
});
