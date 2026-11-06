import {canonicalStopName} from './stopMatching.js';
import {STOP_NAME_EQUIVALENCES} from './stopNameEquivalences.js';

// Apenas aliases revistos; os nomes vagamente parecidos não são ligados.
// O nome da plataforma nunca é prova de que o horário lhe corresponde.
const equivalentNames=new Map();
for(const [left,right] of STOP_NAME_EQUIVALENCES){
 const a=canonicalStopName(left),b=canonicalStopName(right);
 if(!a||!b||a===b||a==='paragem sem nome'||b==='paragem sem nome')continue;
 if(!equivalentNames.has(a))equivalentNames.set(a,new Set([a]));
 if(!equivalentNames.has(b))equivalentNames.set(b,new Set([b]));
 equivalentNames.get(a).add(b);
 equivalentNames.get(b).add(a);
}
export function equivalentStopKeys(name){
 const key=canonicalStopName(name);
 if(!key||key==='paragem sem nome')return [];
 return [...(equivalentNames.get(key)||[key])];
}
export function sameReviewedStopName(a,b){
 const other=canonicalStopName(b);
 return !!other&&equivalentStopKeys(a).includes(other);
}
