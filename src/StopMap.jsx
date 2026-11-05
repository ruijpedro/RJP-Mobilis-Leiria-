import {journeyLegPaths} from './mapJourney.js';
import {directoryStopList} from './lineStopDirectory.js';
import {currentLocation} from './location.js';
import {crowdConfigured,crowdAvailable,submitObservedPassage} from './firebaseCrowd.js';
import React,{useEffect,useRef,useState,useMemo} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {loadOSM} from './osm';
import {matchMappedStop,linesAtStop,canonicalStopName} from './stopMatching.js';
import {upcoming,nearbyStops,normalise,seconds} from './gtfs';
import {stopTimetableSummary} from './stopTimetable.js';
import {nameBasedStopTimetable} from './nameBasedStopTimetable.js';
import {availableLines,routeStopSequence,routeColor} from './routes.js';
import {loadOsmNetwork,routeDescription} from './osmNetwork.js';
import {walkingDirectionsUrl} from './walking.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function markerIconFor(info){
 const confirmed=info?.lines?.length>0;
 const lines=(confirmed?info.lines.map(l=>l.line):(info?.reportedLines||[]).map(l=>'?'+l)).slice(0,3).map(escapeHTML).join(' · ');
 const next=info?.departures?.[0];
 const html='<span class="stop-pin-bus" aria-hidden="true">🚌</span>'
    +(lines?'<span class="stop-pin-lines">'+lines+'</span>':'<span class="stop-pin-lines stop-pin-unknown">?</span>')
    +(next?'<span class="stop-pin-time">'+escapeHTML((next.estimated?'≈ ':'')+next.time.slice(0,5))+'</span>':'');
 return L.divIcon({className:'rjp-marker rjp-marker-info',html,iconSize:[72,76],iconAnchor:[36,38],popupAnchor:[0,-31]});
}
export default function StopMap({data,date,onPick,onPlan,geo,onLocate,journey=null,lineDirectory=null}){
 const div=useRef(null),map=useRef(null),markers=useRef(null),routeLayer=useRef(null),gpsLayer=useRef(null);
 const [crowdMessage,setCrowdMessage]=useState(''),[crowdBusy,setCrowdBusy]=useState(false),[crowdLine,setCrowdLine]=useState(''),[osm,setOsm]=useState([]),[status,setStatus]=useState('A obter paragens OpenStreetMap…'),[active,setActive]=useState(null),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false),[line,setLine]=useState(''),[osmRoutes,setOsmRoutes]=useState([]),[osmLine,setOsmLine]=useState('');
 const gtfs=data?.stops||[];
 const lines=useMemo(()=>data?availableLines(data):[],[data]);
 const discoveryStops=useMemo(()=>new Map(directoryStopList(lineDirectory).map(x=>[canonicalStopName(x.stop_name),x])),[lineDirectory]);
 const visible=useMemo(()=>{const q=normalise(filter);return q?osm.filter(stop=>normalise(stop.stop_name).includes(q)):osm},[osm,filter]);
 async function refresh(force=false){setBusy(true);try{const res=await loadOSM({force});setOsm(res.stops);setStatus(`${res.stops.length} paragens cartografadas · ${res.cache?'cópia local':'OpenStreetMap'}${res.warning?' · '+res.warning:''}`)}catch(e){setStatus('Não foi possível carregar as paragens: '+e.message)}finally{setBusy(false)}}
 useEffect(()=>{refresh(false);loadOsmNetwork().then(setOsmRoutes)},[]);
 useEffect(()=>{if(!div.current||map.current)return;const m=L.map(div.current,{zoomControl:true}).setView([39.743,-8.806],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(m);map.current=m;markers.current=L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,maxClusterRadius:48,disableClusteringAtZoom:17});m.addLayer(markers.current);routeLayer.current=L.layerGroup().addTo(m);gpsLayer.current=L.layerGroup().addTo(m);const resize=setTimeout(()=>m.invalidateSize(),150);return()=>{clearTimeout(resize);m.remove();map.current=null}},[]);
 const closestMapped=useMemo(()=>{if(!geo)return [];const counts=new Map();osm.forEach(x=>{const name=canonicalStopName(x.stop_name);counts.set(name,(counts.get(name)||0)+1)});return nearbyStops(osm,geo.lat,geo.lon,8).map(stop=>{let association=matchMappedStop(stop,gtfs);if(association.status==='name-only'&&counts.get(canonicalStopName(stop.stop_name))>1)association={status:'ambiguous',stop:null,candidates:association.candidates};return {stop,association}})},[geo,osm,gtfs]);
 const closestRoutable=closestMapped.find(item=>item.association.stop);
 const mappedStops=useMemo(()=>{
  const stopCache=new Map();
  const nameCount=new Map();
  for(const stop of osm){const name=canonicalStopName(stop.stop_name);if(name)nameCount.set(name,(nameCount.get(name)||0)+1)}
  return visible.map(stop=>{
   let association=matchMappedStop(stop,gtfs);
   // Se o GTFS não identifica a posição, nomes repetidos no OSM podem
   // representar plataformas de sentidos opostos. Não atribuir horários a ambas.
   if(association.status==='name-only'&&(nameCount.get(canonicalStopName(stop.stop_name))||0)>1)
     association={status:'ambiguous',stop:null,candidates:association.candidates};

   const id=association.stop?.stop_id;
   if(id&&!stopCache.has(id))stopCache.set(id,{
     lines:linesAtStop(data,id),departures:data?upcoming(data,id,date,4):[]
   });
   const reported=discoveryStops.get(canonicalStopName(stop.stop_name));
   const lookup=!id&&data?nameBasedStopTimetable(data,stop.stop_name,date):null;
   const candidateLines=lookup?.lines||[];
   const candidateDepartures=(lookup?.departures||[]).slice(0,4).map(item=>({...item,headsign:item.direction}));
   return {stop,association,info:{...(id?stopCache.get(id):{lines:[],departures:candidateDepartures}),nameOnlyEstimate:!id&&!!lookup?.departures?.length,reportedLines:[...new Set([...(reported?.lines||[]),...candidateLines])],reportedSources:reported?.sources||[]}};
  });
 },[visible,data,date,osm,discoveryStops]);
 useEffect(()=>{
  const g=markers.current;
  if(!map.current||!g)return;
  g.clearLayers();
  for(const {stop,association,info} of mappedStops){
   const a=Number(stop.stop_lat),b=Number(stop.stop_lon);
   if(!Number.isFinite(a)||!Number.isFinite(b))continue;
   const marker=L.marker([a,b],{icon:markerIconFor(info),title:stop.stop_name,
     alt:stop.stop_name+'; '+(info.lines.length?'linhas '+info.lines.map(l=>l.line).join(', '):'sem linhas confirmadas')});
   const name=escapeHTML(stop.stop_name);
   const schedule=info.departures.length?((info.nameOnlyEstimate?'<p class="popup-warning">Horários por nome: sentido e plataforma por confirmar.</p>':'')+info.departures.slice(0,3).map(d=>
     '<div class="popup-departure"><b>Linha '+escapeHTML(d.line)+'</b> · '+escapeHTML((d.estimated?'≈ ':'')+d.time.slice(0,5))+
     ' · '+escapeHTML(d.headsign||'sentido não indicado')+'</div>').join('')):
     association.stop?'<p>Sem partidas programadas disponíveis para esta data/hora.</p>':'<p>Não há horas de passagem validadas para esta plataforma nos dados atuais. Consulta as tabelas oficiais das linhas indicadas abaixo.</p>';
   const official=[...new Set([...info.lines.map(x=>x.line),...info.reportedLines])].filter(x=>/^[1-9]$/.test(String(x)))
     .map(n=>'<a href="https://mobilis.pt/linhas/linha-'+n+'/" target="_blank" rel="noopener noreferrer">Horário oficial linha '+n+'</a>').join(' · ');
   const reported=info.reportedLines.length?'<p>Linhas indicadas no percurso publicado (plataforma não confirmada): '+escapeHTML(info.reportedLines.join(', '))+'</p>':'';
   const warning=info.nameOnlyEstimate?'<p class="popup-warning">Estimativas sujeitas aos horários publicados pela Mobilis. Confirma a plataforma.</p>':association.status==='name-only'?
      '<p class="popup-warning">Correspondência só pelo nome. Confirma a plataforma e o sentido.</p>':
      association.status==='position'?'':'<p class="popup-warning">Paragem OSM sem correspondência segura aos horários digitais.</p>';
   marker.bindPopup('<div class="stop-popup"><strong>🚌 '+name+'</strong>'+warning+reported+schedule+
     '<small>Horários programados, não localização em tempo real.</small>'+(official?'<div class="popup-official">'+official+'</div>':'')+'</div>',{maxWidth:295});
   marker.on('click',()=>setActive(stop));
   g.addLayer(marker);
  }
 },[mappedStops]);
 useEffect(()=>{if(!map.current||!filter.trim()||visible.length===0)return;const points=visible.slice(0,80).map(s=>[Number(s.stop_lat),Number(s.stop_lon)]).filter(p=>p.every(Number.isFinite));if(points.length===1)map.current.setView(points[0],17,{animate:true});else if(points.length>1)map.current.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:15,animate:true})},[filter,visible]);
 useEffect(()=>{const layer=routeLayer.current;if(!layer||!map.current)return;layer.clearLayers();
 if(journey?.legs?.length&&!line&&!osmLine){
 const paths=journeyLegPaths(journey,data,osm);
 const bounds=[];
 for(const leg of paths){
  const color=routeColor('mobilis-'+leg.line);
  if(leg.coordinates.length>1){
   L.polyline(leg.coordinates,{color,weight:6,opacity:.85,dashArray:leg.fullyMapped?undefined:'7 9'})
    .addTo(layer).bindPopup('Linha '+escapeHTML(leg.line)+' · Traçado esquemático, não representa ruas nem confirma plataformas.');
  }
  for(let k=0;k<leg.points.length;k++){
   const p=leg.points[k];bounds.push(p.coordinates);
   const terminus=k===0||k===leg.points.length-1;
   L.circleMarker(p.coordinates,{radius:terminus?9:5,color,fillColor:terminus?'#ffc51d':'#fff',fillOpacity:1,weight:3})
    .addTo(layer).bindPopup('<strong>'+escapeHTML(p.name)+'</strong><p>Linha '+escapeHTML(leg.line)+' · '+escapeHTML(leg.departure.slice(0,5))+'–'+escapeHTML(leg.arrival.slice(0,5))+'</p><small>Localização aproximada; confirma plataforma e sentido.</small>');
  }
 }
 if(bounds.length>1)map.current.fitBounds(L.latLngBounds(bounds),{padding:[40,40],maxZoom:15});
 else if(bounds.length===1)map.current.setView(bounds[0],15);
 return;
}
if(osmLine){const chosen=osmRoutes.find(r=>String(r.osm_id)===osmLine);if(chosen){const segments=chosen.shape_segments||[];const group=L.featureGroup();for(const segment of segments){if(segment.length>1)L.polyline(segment,{color:'#e45429',weight:5,opacity:.9}).addTo(group).addTo(layer)}if(group.getLayers().length)map.current.fitBounds(group.getBounds(),{padding:[35,35],maxZoom:15});}return;}if(!data||!line)return;const coords=routeStopSequence(data,line);if(coords.length>1){const path=L.polyline(coords,{color:routeColor(line),weight:5,opacity:.8,dashArray:'8 7'}).addTo(layer);map.current.fitBounds(path.getBounds(),{padding:[35,35],maxZoom:15})}},[data,line,osmLine,osmRoutes,journey,osm]);
 useEffect(()=>{const layer=gpsLayer.current;if(!layer)return;layer.clearLayers();if(geo){L.circleMarker([geo.lat,geo.lon],{radius:9,color:'#176bd0',fillColor:'#176bd0',fillOpacity:.85}).addTo(layer).bindPopup('A tua localização GPS');map.current?.setView([geo.lat,geo.lon],15)}},[geo]);

 async function reportPassage(){if(!active||crowdBusy)return;if(!crowdLine.trim()){setCrowdMessage('Indica o número da linha.');return}setCrowdBusy(true);setCrowdMessage('A confirmar posição GPS…');try{const pos=await currentLocation();const r=await submitObservedPassage({stop:active,line:crowdLine.trim(),direction:'',lat:pos.lat,lon:pos.lon});setCrowdMessage(r.notice||'Observação recebida.')}catch(e){setCrowdMessage(e.message||'Falha na comunicação.')}finally{setCrowdBusy(false)}}
 const association=active?(mappedStops.find(entry=>entry.stop.stop_id===active.stop_id)?.association||matchMappedStop(active,gtfs)):null;
 const match=association?.stop||null;
 const servingLines=match?linesAtStop(data,match.stop_id):[];
 const timetable=useMemo(()=>match&&data?stopTimetableSummary(data,match.stop_id,date):{groups:[],departures:0,lines:[]},[data,match?.stop_id,date.getTime()]);
 const byName=useMemo(()=>!match&&active&&data?nameBasedStopTimetable(data,active.stop_name,date):null,[data,active?.stop_name,match?.stop_id,date.getTime()]);
 const nowSeconds=date.getHours()*3600+date.getMinutes()*60;
 const todayDepartures=timetable.groups.flatMap(g=>g.departures.filter(p=>seconds(p.time)>=nowSeconds).map(p=>({line:g.line,direction:g.direction,...p}))).sort((a,b)=>seconds(a.time)-seconds(b.time));
 const reportedForActive=active?discoveryStops.get(canonicalStopName(active.stop_name)):null;
 const closest=closestMapped.slice(0,5).map(({stop})=>stop);
 const mappedCount=mappedStops.filter(x=>x.association.stop).length;
 const selectedDistance=geo&&active?nearbyStops([active],geo.lat,geo.lon,1)[0]?.distance:null;
 function focusStop(stop){setActive(stop);const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);if(map.current&&Number.isFinite(lat)&&Number.isFinite(lon)){map.current.setView([lat,lon],17,{animate:true})}}

 return <div className="panel map-panel"><div className="map-heading"><div><h2>Mapa interativo de Leiria</h2><p className="muted">Símbolos grandes com linhas e próxima partida programada. Toca numa paragem para veres os horários e sentidos disponíveis.</p></div><button onClick={onLocate} className="gps-button">◎ GPS</button></div>
 <div className="mapactions"><input aria-label="Procurar paragem" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="🔎 Procurar paragem..."/><select aria-label="Filtrar linha" value={line} onChange={e=>{setLine(e.target.value);if(e.target.value)setOsmLine('')}}><option value="">Todas as linhas</option>{lines.map(l=><option key={l.route_id} value={l.route_id}>Linha {l.route_short_name||l.route_long_name}</option>)}</select><select aria-label="Traçado OSM" value={osmLine} onChange={e=>{setOsmLine(e.target.value);if(e.target.value)setLine('')}}><option value="">Traçados Mobilis OSM ({osmRoutes.length})</option>{osmRoutes.map(r=><option key={r.osm_id} value={r.osm_id}>{routeDescription(r)}</option>)}</select><button onClick={()=>refresh(true)} disabled={busy}>{busy?'A atualizar…':'↻ Atualizar'}</button></div>
 <p className="map-legend">🟨 Linhas e horários na base · 🚌 ? Sem horários associados · Os horários são programados e podem não incluir todos os sentidos.</p>
 {journey?.legs?.length&&<div className="journey-map-summary"><strong>{journey.estimated?'≈ ':''}{journey.legs[0].departure.slice(0,5)} → {journey.legs.at(-1).arrival.slice(0,5)}</strong><span>{journey.journeyMinutes} min de viagem · {journey.ridingMinutes} min no autocarro · {journey.waitingMinutes} min de espera · {journey.transfers} transbordo(s)</span><div className="journey-lines">{journey.legs.map((leg,i)=><span key={leg.tripId+'-'+i} style={{borderColor:routeColor('mobilis-'+leg.line)}}>Linha {leg.line}{leg.estimated?' ≈':''}</span>)}</div><small>Traçados esquemáticos pelos pontos disponíveis; não representam as ruas nem confirmam a plataforma. Horas com ≈ são estimadas.</small><button type="button" onClick={onPlan}>Alterar origem ou destino</button></div>}{filter.trim()&&<div className="stop-search-results"><strong>{visible.length} paragem(ns) encontradas</strong>{visible.slice(0,8).map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>📍 {s.stop_name} <span>Ver no mapa</span></button>)}</div>}<div ref={div} className="leaflet-map" aria-label="Mapa interativo de paragens de Leiria"/><div className="osm-status">{status} · {visible.length} visíveis · {mappedCount} associadas a horários</div>
 {osmLine&&<p className="map-warning">Traçado das ruas proveniente das relações OpenStreetMap; pode estar incompleto, não garante serviço Mobilis nem horários. Os troços descontínuos não são ligados artificialmente.</p>}{line&&<p className="map-warning">Trajeto tracejado esquemático: liga as paragens na ordem do GTFS; não representa necessariamente as ruas percorridas. Para geometria oficial é necessário shapes.txt.</p>}
 {active&&<div className="mapdetails"><button className="close-map" aria-label="Fechar informação" onClick={()=>{setActive(null);setCrowdMessage('')}}>×</button><h3>🚌 {active.stop_name}</h3><small>OpenStreetMap · {active.ref?'Ref. '+active.ref:'sem referência publicada'} · {Number(active.stop_lat).toFixed(5)}, {Number(active.stop_lon).toFixed(5)}</small>{Number.isFinite(selectedDistance)&&<p className="stop-distance">📍 A cerca de <b>{Math.round(selectedDistance)} m</b> em linha reta da tua posição GPS. O percurso a pé pode ser maior.</p>}{match?<><p><b>{association.status==='position'?'Paragem associada por posição e nome':'Correspondência apenas pelo nome'}</b> · {match.stop_name}. {association.status==='name-only'?'A posição GTFS não está publicada: confirma a plataforma e o sentido antes de embarcar.':`Distância entre dados: ${Math.round(match.distance)} m.`}</p>{servingLines.length>0&&<div className="served-lines"><strong>Linhas com horários nesta paragem:</strong>{servingLines.map(l=><span key={l.id} className="line-chip" title={l.description}>{l.line}</span>)}</div>}<b>Horários de passagem nesta paragem</b><p className="muted">{timetable.departures} passagem(ns) documentadas para este dia, {todayDepartures.length} a partir da hora selecionada. Cada hora corresponde a esta paragem, não à partida do terminal. ≈ significa estimativa entre duas referências oficiais.</p>{timetable.groups.map(g=><div className="timetable-group" key={g.line+'-'+g.direction}><strong>Linha {g.line} · {g.direction}</strong><div className="departures">{g.departures.map((p,i)=><span key={p.tripId+'-'+i}>{p.estimated?'≈ ':''}{p.time.slice(0,5)}</span>)}</div>{g.sources.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Tabela oficial ↗</a>)}</div>)}{!timetable.groups.length&&<p className="muted">Sem horas de passagem digitalizadas nesta paragem para este dia. Isso não significa que não existam autocarros; consulta a tabela oficial do operador.</p>}</>:<div>{reportedForActive?.lines?.length>0&&<p><b>Linhas indicadas no percurso publicado:</b> {reportedForActive.lines.join(', ')}. Não estão confirmados o sentido nem a plataforma.</p>}{byName?.groups?.length>0&&<div className="provisional-timetable"><strong>Passagens associadas pelo nome da paragem (em teste)</strong><p className="muted">Plataforma e sentido por confirmar. Estas horas dependem dos horários publicados pela Mobilis; ≈ indica interpolação, não localização em tempo real.</p>{byName.groups.map(g=><div className="timetable-group" key={g.line+'-'+g.direction}><strong>Linha {g.line} · {g.direction}</strong><div className="departures">{g.departures.map((p,i)=><span key={p.tripId+'-'+i}>{p.estimated?'≈ ':''}{p.time.slice(0,5)}</span>)}</div>{g.sources.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Horário Mobilis ↗</a>)}</div>)}</div>}<p className="muted">Localização cartografada. {association?.status==='ambiguous'?'Há várias paragens GTFS com o mesmo nome; não foi possível confirmar qual corresponde a esta plataforma.':'Não há correspondência segura com os horários disponíveis.'} As linhas indicadas no catálogo são informativas e não garantem a plataforma nem a hora de passagem. Consulta os horários oficiais abaixo e confirma o sentido antes de embarcar.</p>{reportedForActive?.lines?.length>0&&<div className="popup-official"><strong>Horários oficiais das linhas indicadas:</strong> {reportedForActive.lines.filter(n=>/^[1-9]$/.test(String(n))).map(n=><a key={n} href={'https://mobilis.pt/linhas/linha-'+n+'/'} target="_blank" rel="noopener noreferrer">Linha {n} ↗ </a>)}</div>}</div>}<div className="crowd-panel"><b>🚌 Viste um autocarro passar?</b><p className="muted">Registo voluntário e anónimo. Apenas a menos de 75 m da paragem; não confirma a chegada em tempo real.</p><div className="mapactions"><input aria-label="Número da linha observada" placeholder="Linha (ex.: 7)" value={crowdLine} onChange={e=>setCrowdLine(e.target.value)} maxLength={10}/><button disabled={!crowdAvailable()||crowdBusy} onClick={reportPassage}>{crowdBusy?'A registar…':'Vi o autocarro passar'}</button></div>{!crowdConfigured&&<small>Firebase por configurar — registo comunitário indisponível.</small>}{crowdConfigured&&!crowdAvailable()&&<small>Registo comunitário Android pendente da integração nativa Play Integrity; usa a WebApp para testar.</small>}{crowdMessage&&<p role="status">{crowdMessage}</p>}</div><div className="mapactions"><button onClick={()=>onPick('from',match||active)}>📍 Usar como origem</button><button onClick={()=>onPick('to',match||active)}>🏁 Usar como destino</button><button onClick={onPlan}>Ver percursos</button><a className="walk-button" href={walkingDirectionsUrl(active,geo)||undefined} target="_blank" rel="noopener noreferrer">🚶 Como chegar a pé</a></div></div>}
 {geo&&closest.length>0&&<div className="closest"><b>Paragens próximas</b>{closestRoutable&&<button className="nearest-routable" onClick={()=>{onPick('from',closestRoutable.association.stop);onPlan()}}>🚌 Planear desde {closestRoutable.stop.stop_name} · {Math.round(closestRoutable.stop.distance)} m em linha reta</button>}{closest.map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>{s.stop_name} · {Math.round(s.distance)} m</button>)}</div>}
 <p className="muted map-credit">Seleciona qualquer paragem no mapa como origem ou destino. Sem correspondência segura aos horários, o planeador indica a limitação e não inventa viagens. Mapas © OpenStreetMap contributors. Os pontos OSM não confirmam serviço ativo. Linhas, destinos e horários são mostrados apenas se houver dados de horários associados, não em tempo real.</p></div>;
}
