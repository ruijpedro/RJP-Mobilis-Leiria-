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
