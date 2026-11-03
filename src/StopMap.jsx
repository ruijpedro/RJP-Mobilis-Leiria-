import {currentLocation} from './location.js';
import {crowdConfigured,crowdAvailable,submitObservedPassage} from './firebaseCrowd.js';
import React,{useEffect,useRef,useState,useMemo} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {loadOSM} from './osm';
import {matchMappedStop,linesAtStop} from './stopMatching.js';
import {upcoming,nearbyStops,normalise} from './gtfs';
import {availableLines,routeStopSequence,routeColor} from './routes.js';
import {loadOsmNetwork,routeDescription} from './osmNetwork.js';
import {walkingDirectionsUrl} from './walking.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function markerIconFor(info){
 const lines=info?.lines?.slice(0,3).map(l=>escapeHTML(l.line)).join(' · ');
 const next=info?.departures?.[0];
 const html='<span class="stop-pin-bus" aria-hidden="true">🚌</span>'
    +(lines?'<span class="stop-pin-lines">'+lines+'</span>':'<span class="stop-pin-lines stop-pin-unknown">?</span>')
    +(next?'<span class="stop-pin-time">'+escapeHTML(next.time.slice(0,5))+'</span>':'');
 return L.divIcon({className:'rjp-marker rjp-marker-info',html,iconSize:[72,76],iconAnchor:[36,38],popupAnchor:[0,-31]});
}
export default function StopMap({data,date,onPick,onPlan,geo,onLocate,journey=null}){
 const div=useRef(null),map=useRef(null),markers=useRef(null),routeLayer=useRef(null),gpsLayer=useRef(null);
 const [crowdMessage,setCrowdMessage]=useState(''),[crowdBusy,setCrowdBusy]=useState(false),[crowdLine,setCrowdLine]=useState(''),[osm,setOsm]=useState([]),[status,setStatus]=useState('A obter paragens OpenStreetMap…'),[active,setActive]=useState(null),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false),[line,setLine]=useState(''),[osmRoutes,setOsmRoutes]=useState([]),[osmLine,setOsmLine]=useState('');
 const gtfs=data?.stops||[];
 const lines=useMemo(()=>data?availableLines(data):[],[data]);
 const visible=useMemo(()=>{const q=normalise(filter);return q?osm.filter(stop=>normalise(stop.stop_name).includes(q)):osm},[osm,filter]);
 async function refresh(force=false){setBusy(true);try{const res=await loadOSM({force});setOsm(res.stops);setStatus(`${res.stops.length} paragens cartografadas · ${res.cache?'cópia local':'OpenStreetMap'}${res.warning?' · '+res.warning:''}`)}catch(e){setStatus('Não foi possível carregar as paragens: '+e.message)}finally{setBusy(false)}}
 useEffect(()=>{refresh(false);loadOsmNetwork().then(setOsmRoutes)},[]);
 useEffect(()=>{if(!div.current||map.current)return;const m=L.map(div.current,{zoomControl:true}).setView([39.743,-8.806],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(m);map.current=m;markers.current=L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,maxClusterRadius:48,disableClusteringAtZoom:17});m.addLayer(markers.current);routeLayer.current=L.layerGroup().addTo(m);gpsLayer.current=L.layerGroup().addTo(m);const resize=setTimeout(()=>m.invalidateSize(),150);return()=>{clearTimeout(resize);m.remove();map.current=null}},[]);
 const mappedStops=useMemo(()=>{
  const stopCache=new Map();
  return visible.map(stop=>{
   const association=matchMappedStop(stop,gtfs);
   const id=association.stop?.stop_id;
   if(id&&!stopCache.has(id))stopCache.set(id,{
     lines:linesAtStop(data,id),departures:data?upcoming(data,id,date,4):[]
   });
   return {stop,association,info:id?stopCache.get(id):{lines:[],departures:[]}};
  });
 },[visible,data,date]);
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
   const schedule=info.departures.length?info.departures.slice(0,3).map(d=>
     '<div class="popup-departure"><b>Linha '+escapeHTML(d.line)+'</b> · '+escapeHTML(d.time.slice(0,5))+
     ' · '+escapeHTML(d.headsign||'sentido não indicado')+'</div>').join(''):
     '<p>Sem partidas programadas disponíveis para esta data/hora.</p>';
   const warning=association.status==='name-only'?
      '<p class="popup-warning">Correspondência só pelo nome. Confirma a plataforma e o sentido.</p>':
      association.status==='position'?'':'<p class="popup-warning">Sem associação segura aos horários GTFS.</p>';
   marker.bindPopup('<div class="stop-popup"><strong>🚌 '+name+'</strong>'+warning+schedule+
     '<small>Horários programados, não localização em tempo real.</small></div>',{maxWidth:295});
   marker.on('click',()=>setActive(stop));
   g.addLayer(marker);
  }
 },[mappedStops]);
 useEffect(()=>{if(!map.current||!filter.trim()||visible.length===0)return;const points=visible.slice(0,80).map(s=>[Number(s.stop_lat),Number(s.stop_lon)]).filter(p=>p.every(Number.isFinite));if(points.length===1)map.current.setView(points[0],17,{animate:true});else if(points.length>1)map.current.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:15,animate:true})},[filter,visible]);
 useEffect(()=>{const layer=routeLayer.current;if(!layer||!map.current)return;layer.clearLayers();
 if(journey?.legs?.length&&!line&&!osmLine){const all=[journey.legs[0].from,...journey.legs.map(l=>l.to)];const points=[];for(const id of all){const st=gtfs.find(x=>x.stop_id===id);if(!st)continue;const coord=(st.stop_lat&&st.stop_lon)?st:osm.find(o=>o.stop_name.toLocaleLowerCase('pt')===st.stop_name.toLocaleLowerCase('pt'));if(coord&&Number.isFinite(+coord.stop_lat)&&Number.isFinite(+coord.stop_lon)&&+coord.stop_lat!==0){const ll=[+coord.stop_lat,+coord.stop_lon];points.push(ll);L.circleMarker(ll,{radius:11,color:'#062e59',fillColor:'#ffc51d',fillOpacity:1,weight:3}).addTo(layer).bindPopup(st.stop_name)}}if(points.length>1){L.polyline(points,{color:'#ffc51d',weight:6,dashArray:'7 9',opacity:.92}).addTo(layer);map.current.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:15})}return;}
if(osmLine){const chosen=osmRoutes.find(r=>String(r.osm_id)===osmLine);if(chosen){const segments=chosen.shape_segments||[];const group=L.featureGroup();for(const segment of segments){if(segment.length>1)L.polyline(segment,{color:'#e45429',weight:5,opacity:.9}).addTo(group).addTo(layer)}if(group.getLayers().length)map.current.fitBounds(group.getBounds(),{padding:[35,35],maxZoom:15});}return;}if(!data||!line)return;const coords=routeStopSequence(data,line);if(coords.length>1){const path=L.polyline(coords,{color:routeColor(line),weight:5,opacity:.8,dashArray:'8 7'}).addTo(layer);map.current.fitBounds(path.getBounds(),{padding:[35,35],maxZoom:15})}},[data,line,osmLine,osmRoutes,journey,osm]);
 useEffect(()=>{const layer=gpsLayer.current;if(!layer)return;layer.clearLayers();if(geo){L.circleMarker([geo.lat,geo.lon],{radius:9,color:'#176bd0',fillColor:'#176bd0',fillOpacity:.85}).addTo(layer).bindPopup('A tua localização GPS');map.current?.setView([geo.lat,geo.lon],15)}},[geo]);

 async function reportPassage(){if(!active||crowdBusy)return;if(!crowdLine.trim()){setCrowdMessage('Indica o número da linha.');return}setCrowdBusy(true);setCrowdMessage('A confirmar posição GPS…');try{const pos=await currentLocation();const r=await submitObservedPassage({stop:active,line:crowdLine.trim(),direction:'',lat:pos.lat,lon:pos.lon});setCrowdMessage(r.notice||'Observação recebida.')}catch(e){setCrowdMessage(e.message||'Falha na comunicação.')}finally{setCrowdBusy(false)}}
 const association=active?matchMappedStop(active,gtfs):null;
 const match=association?.stop||null;
 const servingLines=match?linesAtStop(data,match.stop_id):[];
 const departures=match&&data?upcoming(data,match.stop_id,date,12):[];
 const closest=geo?nearbyStops(osm,geo.lat,geo.lon,5):[];
 const selectedDistance=geo&&active?nearbyStops([active],geo.lat,geo.lon,1)[0]?.distance:null;
 function focusStop(stop){setActive(stop);const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);if(map.current&&Number.isFinite(lat)&&Number.isFinite(lon)){map.current.setView([lat,lon],17,{animate:true})}}

 return <div className="panel map-panel"><div className="map-heading"><div><h2>Mapa interativo de Leiria</h2><p className="muted">Símbolos grandes com linhas e próxima partida programada. Toca numa paragem para veres os horários e sentidos disponíveis.</p></div><button onClick={onLocate} className="gps-button">◎ GPS</button></div>
 <div className="mapactions"><input aria-label="Procurar paragem" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="🔎 Procurar paragem..."/><select aria-label="Filtrar linha" value={line} onChange={e=>{setLine(e.target.value);if(e.target.value)setOsmLine('')}}><option value="">Todas as linhas</option>{lines.map(l=><option key={l.route_id} value={l.route_id}>Linha {l.route_short_name||l.route_long_name}</option>)}</select><select aria-label="Traçado OSM" value={osmLine} onChange={e=>{setOsmLine(e.target.value);if(e.target.value)setLine('')}}><option value="">Traçados OSM ({osmRoutes.length})</option>{osmRoutes.map(r=><option key={r.osm_id} value={r.osm_id}>{routeDescription(r)}</option>)}</select><button onClick={()=>refresh(true)} disabled={busy}>{busy?'A atualizar…':'↻ Atualizar'}</button></div>
 {journey?.legs?.length&&<p className="map-warning">Percurso programado disponível: {journey.legs.map(l=>'Linha '+l.line).join(' → ')}. O tracejado é esquemático; não representa as ruas percorridas.</p>}{filter.trim()&&<div className="stop-search-results"><strong>{visible.length} paragem(ns) encontradas</strong>{visible.slice(0,8).map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>📍 {s.stop_name} <span>Ver no mapa</span></button>)}</div>}<div ref={div} className="leaflet-map" aria-label="Mapa interativo de paragens de Leiria"/><div className="osm-status">{status} · {visible.length} visíveis</div>
 {osmLine&&<p className="map-warning">Traçado das ruas proveniente das relações OpenStreetMap; pode estar incompleto, não garante serviço Mobilis nem horários. Os troços descontínuos não são ligados artificialmente.</p>}{line&&<p className="map-warning">Trajeto tracejado esquemático: liga as paragens na ordem do GTFS; não representa necessariamente as ruas percorridas. Para geometria oficial é necessário shapes.txt.</p>}
 {active&&<div className="mapdetails"><button className="close-map" aria-label="Fechar informação" onClick={()=>{setActive(null);setCrowdMessage('')}}>×</button><h3>🚌 {active.stop_name}</h3><small>OpenStreetMap · {active.ref?'Ref. '+active.ref:'sem referência publicada'} · {Number(active.stop_lat).toFixed(5)}, {Number(active.stop_lon).toFixed(5)}</small>{Number.isFinite(selectedDistance)&&<p className="stop-distance">📍 A cerca de <b>{Math.round(selectedDistance)} m</b> em linha reta da tua posição GPS. O percurso a pé pode ser maior.</p>}{match?<><p><b>{association.status==='position'?'Paragem associada por posição e nome':'Correspondência apenas pelo nome'}</b> · {match.stop_name}. {association.status==='name-only'?'A posição GTFS não está publicada: confirma a plataforma e o sentido antes de embarcar.':`Distância entre dados: ${Math.round(match.distance)} m.`}</p>{servingLines.length>0&&<div className="served-lines"><strong>Linhas com horários nesta paragem:</strong>{servingLines.map(l=><span key={l.id} className="line-chip" title={l.description}>{l.line}</span>)}</div>}{departures.length?<><b>Próximas partidas programadas</b>{departures.map((d,i)=><div className="mapdeparture" key={i}><strong className="line-chip">{d.line}</strong><span>{d.headsign||'Destino não indicado'}</span><b>{d.time.slice(0,5)}</b></div>)}</>:<p className="muted">Sem partidas confirmadas para a data e hora selecionadas.</p>}</>:<p className="muted">Localização cartografada. {association?.status==='ambiguous'?'Há várias paragens GTFS com o mesmo nome; não foi possível confirmar qual corresponde a esta plataforma.':'Não há correspondência segura com os horários disponíveis.'} Confirma o sentido e importa um GTFS completo se necessário.</p>}<div className="crowd-panel"><b>🚌 Viste um autocarro passar?</b><p className="muted">Registo voluntário e anónimo. Apenas a menos de 75 m da paragem; não confirma a chegada em tempo real.</p><div className="mapactions"><input aria-label="Número da linha observada" placeholder="Linha (ex.: 7)" value={crowdLine} onChange={e=>setCrowdLine(e.target.value)} maxLength={10}/><button disabled={!crowdAvailable()||crowdBusy} onClick={reportPassage}>{crowdBusy?'A registar…':'Vi o autocarro passar'}</button></div>{!crowdConfigured&&<small>Firebase por configurar — registo comunitário indisponível.</small>}{crowdConfigured&&!crowdAvailable()&&<small>Registo comunitário Android pendente da integração nativa Play Integrity; usa a WebApp para testar.</small>}{crowdMessage&&<p role="status">{crowdMessage}</p>}</div><div className="mapactions"><button disabled={!match} title={!match?'Sem ligação confirmada aos horários GTFS':''} onClick={()=>onPick('from',match)}>📍 Usar como origem</button><button disabled={!match} title={!match?'Sem ligação confirmada aos horários GTFS':''} onClick={()=>onPick('to',match)}>🏁 Usar como destino</button><button onClick={onPlan}>Ver percursos</button><a className="walk-button" href={walkingDirectionsUrl(active,geo)||undefined} target="_blank" rel="noopener noreferrer">🚶 Como chegar a pé</a></div></div>}
 {geo&&closest.length>0&&<div className="closest"><b>Paragens próximas</b>{closest.map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>{s.stop_name} · {Math.round(s.distance)} m</button>)}</div>}
 <p className="muted map-credit">Mapas © OpenStreetMap contributors. Os pontos OSM não confirmam serviço ativo. Linhas, destinos e horários são mostrados apenas se houver dados de horários associados, não em tempo real.</p></div>;
}
