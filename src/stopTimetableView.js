import {seconds} from './gtfs.js';

/**
 * Filtra as passagens JÁ DIGITALIZADAS pelo instante escolhido no planeador.
 * Mantém as linhas/sentidos e fontes; não calcula nem gera novas partidas.
 */
export function timetableFromTime(groups,date,{allDay=false}={}){
 const since=date.getHours()*3600+date.getMinutes()*60+date.getSeconds();
 return (groups||[]).map(group=>({
  ...group,
  departures:(group.departures||[]).filter(d=>allDay||seconds(d.time)>=since)
 })).filter(group=>group.departures.length>0);
}
export function countTimetableDepartures(groups){
 return (groups||[]).reduce((n,g)=>n+(g.departures?.length||0),0);
}

/** Próximas passagens já existentes, ordenadas a partir da hora escolhida. */
export function nextStopDepartures(departures,date,limit=4){
 const since=date.getHours()*3600+date.getMinutes()*60+date.getSeconds();
 return (departures||[]).filter(x=>Number.isFinite(seconds(x.time))&&seconds(x.time)>=since)
  .sort((a,b)=>seconds(a.time)-seconds(b.time)).slice(0,Math.max(0,limit));
}

/** Resumo de informação por linha e sentido, sem criar passagens adicionais. */
export function summariseTimetableGroups(groups){
 const rows=(groups||[]).map(group=>{
  const departures=group.departures||[];
  return {line:group.line,direction:group.direction,
   total:departures.length,
   published:departures.filter(d=>!d.estimated).length,
   estimated:departures.filter(d=>!!d.estimated).length,
   next:departures.length?departures.reduce((best,d)=>seconds(d.time)<seconds(best.time)?d:best):null};
 });
 return {lines:[...new Set(rows.map(r=>r.line))],
  directions:rows.length,
  published:rows.reduce((n,r)=>n+r.published,0),
  estimated:rows.reduce((n,r)=>n+r.estimated,0),
  rows};
}
