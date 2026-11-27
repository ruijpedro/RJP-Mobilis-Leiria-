import {buildEstimatedVehicleIndex,estimatedVehicles} from './estimatedVehicles.js';
import {journeyLegPaths} from './mapJourney.js';
import {buildStopLineIndex,stopLineAssociation} from './stopLineAssociations.js';
import {nearbyIdentifiedStops} from './nearbyIdentifiedStops.js';
import {auditMappedStopCoverage} from './mappedStopCoverage.js';
import {filterMappedStops} from './mapStopFilters.js';
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
import {timetableFromTime,countTimetableDepartures,nextStopDepartures,summariseTimetableGroups} from './stopTimetableView.js';
import {availableLines,routeStopSequence,routeColor} from './routes.js';
import {loadOsmNetwork,routeDescription,osmSegmentsForLine} from './osmNetwork.js';
import {walkingDirectionsUrl} from './walking.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function markerIconFor(info){
 const allLines=info?.routeLines||[];
 const lines=allLines.slice(0,5).map(escapeHTML).join(' · ')+(allLines.length>5?' +'+(allLines.length-5):'');
 const next=info?.departures?.[0];
 const html='<span class="stop-pin-bus" aria-hidden="true">🚌</span>'
    +(lines?'<span class="stop-pin-lines">'+lines+'</span>':'')
    +(next?'<span class="stop-pin-time">'+escapeHTML((next.estimated?'≈ ':'')+next.time.slice(0,5))+'</span>':'');
 return L.divIcon({className:'rjp-marker rjp-marker-info',html,iconSize:[72,76],iconAnchor:[36,38],popupAnchor:[0,-31]});
}
// Liga apenas paragens consecutivas identificadas na cartografia.
// É uma aproximação em linha reta, NÃO um percurso pelas ruas.
function directorySchematic(lineNumber,directory,osmStops){
 const names=directory?.routes?.[String(lineNumber)]?.stops||[];
 const byName=new Map();
 for(const stop of osmStops||[]){const key=canonicalStopName(stop.stop_name);const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);if(key&&Number.isFinite(lat)&&Number.isFinite(lon)){const arr=byName.get(key)||[];arr.push([lat,lon]);byName.set(key,arr)}}
 const located=[];
 for(const [index,name] of names.entries()){
  const choices=byName.get(canonicalStopName(name))||[];
  // Nomes repetidos podem corresponder a plataformas opostas: não adivinhar.
  if(choices.length===1)located.push({index,point:choices[0]});
 }
 const segments=[];
 for(let i=1;i<located.length;i++){
  const prev=located[i-1],next=located[i];
  const dy=(next.point[0]-prev.point[0])*111000,dx=(next.point[1]-prev.point[1])*86000;
  const distance=Math.hypot(dx,dy);
  // Liga pontos cartografados mesmo que existam paragens intermédias sem coordenadas.
  // Saltos muito longos não são desenhados: não representam uma estrada confirmada.
  if(distance>5&&distance<8000)segments.push([prev.point,next.point]);
 }
 return segments;
}
export default function StopMap({data,date,onPick,onPlan,geo,onLocate,journey=null,lineDirectory=null,favoriteIds=[],onToggleFavorite=()=>{}}){
 const div=useRef(null),map=useRef(null),markers=useRef(null),routeLayer=useRef(null),gpsLayer=useRef(null);
 const [regionalLine,setRegionalLine]=useState(''),[allNetworkRoutes,setAllNetworkRoutes]=useState([]); const [routeDirection,setRouteDirection]=useState('all'),[showAllRoutes,setShowAllRoutes]=useState(false),[networkFilter,setNetworkFilter]=useState('all'),[regionalStops,setRegionalStops]=useState([]),[coverageFilter,setCoverageFilter]=useState('all'),[showAllDay,setShowAllDay]=useState(false),[crowdMessage,setCrowdMessage]=useState(''),[crowdBusy,setCrowdBusy]=useState(false),[crowdLine,setCrowdLine]=useState(''),[osm,setOsm]=useState([]),[status,setStatus]=useState('A obter paragens OpenStreetMap…'),[active,setActive]=useState(null),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false),[line,setLine]=useState(''),[osmRoutes,setOsmRoutes]=useState([]),[osmLine,setOsmLine]=useState('');
 useEffect(()=>{fetch(`${import.meta.env.BASE_URL}data/regional-stops.json`).then(r=>r.ok?r.json():null).then(d=>setRegionalStops((d?.stops||[]).filter(s=>(s.reviewStatus==='verified'||s.reviewStatus==='osm-linked')&&s.source&&s.name&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)))).catch(()=>setRegionalStops([]))},[]);
 const [onlyVehicles,setOnlyVehicles]=useState(false),[vehicleDiagnostic,setVehicleDiagnostic]=useState({});
 const [onboardId,setOnboardId]=useState(''),[onboardVehicles,setOnboardVehicles]=useState([]),[exitStop,setExitStop]=useState(''),[lead,setLead]=useState(5),[followBus,setFollowBus]=useState(false);
 const [showVehicles,setShowVehicles]=useState(true),[vehicleCount,setVehicleCount]=useState(0);
 const vehicleIndex=useMemo(()=>showVehicles&&data?buildEstimatedVehicleIndex(data,osm,osmRoutes):[],[showVehicles,data,osm,osmRoutes]);
 const gtfs=data?.stops||[];
 const regionalMatches=useMemo(()=>regionalStops.filter(s=>!filter.trim()||canonicalStopName(s.name).includes(canonicalStopName(filter))),[regionalStops,filter]);
 const lines=useMemo(()=>data?availableLines(data):[],[data]);
 const discoveryStops=useMemo(()=>buildStopLineIndex(lineDirectory),[lineDirectory]);
 const audit=useMemo(()=>auditMappedStopCoverage(osm,lineDirectory,data),[osm,lineDirectory,data]);
 const auditByStop=useMemo(()=>new Map(audit.rows.map(row=>[row.stopId,row])),[audit]);
 const selectedLineRoute=useMemo(()=>lines.find(item=>item.route_id===line),[lines,line]);
 const selectedOsmDirections=useMemo(()=>selectedLineRoute?osmRoutes.filter(r=>String(r.ref||'').trim()===String(selectedLineRoute.route_short_name||'').trim()&&Array.isArray(r.shape_segments)&&r.shape_segments.length):[],[selectedLineRoute,osmRoutes]);
 const selectedLineName=useMemo(()=>lines.find(item=>item.route_id===line)?.route_short_name||lines.find(item=>item.route_id===line)?.route_long_name||'',[lines,line]);
 const visible=useMemo(()=>filterMappedStops(osm,auditByStop,{search:filter,coverage:coverageFilter,lineName:selectedLineName}),[osm,auditByStop,filter,coverageFilter,selectedLineName]);
 async function refresh(force=false){setBusy(true);try{const res=await loadOSM({force});setOsm(res.stops);setStatus(`${res.stops.length} paragens cartografadas · ${res.cache?'cópia local':'OpenStreetMap'}${res.warning?' · '+res.warning:''}`)}catch(e){setStatus('Não foi possível carregar as paragens: '+e.message)}finally{setBusy(false)}}
 useEffect(()=>{refresh(false);loadOsmNetwork().then(setOsmRoutes);loadOsmNetwork({includeRegional:true}).then(setAllNetworkRoutes)},[]);
 useEffect(()=>{if(!div.current||map.current)return;const m=L.map(div.current,{zoomControl:true}).setView([39.743,-8.806],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(m);map.current=m;markers.current=L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,maxClusterRadius:48,disableClusteringAtZoom:17});m.addLayer(markers.current);routeLayer.current=L.layerGroup().addTo(m);gpsLayer.current=L.layerGroup().addTo(m);const resize=setTimeout(()=>m.invalidateSize(),150);return()=>{clearTimeout(resize);m.remove();map.current=null}},[]);
 useEffect(()=>{
  if(!showVehicles||!data||!map.current||networkFilter==='regional'||routeDirection!=='all'){setVehicleCount(0);setVehicleDiagnostic({});setOnboardVehicles([]);return;}
  const layer=L.layerGroup().addTo(map.current), pins=new Map();
  const selectedRef=osmRoutes.find(r=>String(r.osm_id)===String(osmLine))?.ref;
  function tick(){
   const diagnostic={};
   const allVehicles=estimatedVehicles(vehicleIndex,data,new Date(),diagnostic);setOnboardVehicles(allVehicles);
   const vehicles=allVehicles.filter(v=>(!line||v.routeId===line)&&(!osmLine||(selectedRef&&String(v.line)===String(selectedRef))));
   const live=new Set(vehicles.map(v=>v.id));
   for(const [id,pin] of pins)if(!live.has(id)){layer.removeLayer(pin);pins.delete(id);}
   for(const v of vehicles){
    let pin=pins.get(v.id);
    if(!pin){
     const color=routeColor(v.line);
     pin=L.marker([v.lat,v.lon],{zIndexOffset:1000,title:'Linha '+v.line+' — posição estimada',alt:'Autocarro da linha '+v.line+' — posição estimada',icon:L.divIcon({className:'rjp-estimated-vehicle',iconSize:[44,44],iconAnchor:[22,22],html:'<span style="box-sizing:border-box;display:flex;width:44px;height:44px;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #2229,0 3px 9px #0009;background:'+escapeHTML(color)+';align-items:center;justify-content:center;color:white;font-size:20px;font-weight:800;line-height:1;text-shadow:0 1px 3px #000c">'+escapeHTML(v.line)+'</span>'})}).addTo(layer);
     pin.bindPopup('');pin.on('popupopen',e=>{const el=e.popup.getElement();if(el)el.onclick=ev=>{if(ev.target.closest('[data-onboard]')){setOnboardId(v.id);setExitStop('');setFollowBus(false);map.current?.closePopup();}};});pins.set(v.id,pin);
    }
    pin.setLatLng([v.lat,v.lon]);
    pin.setPopupContent('<strong>Linha '+escapeHTML(v.line)+'</strong><p>'+escapeHTML(v.headsign)+'</p><p>Próxima paragem: '+escapeHTML(v.nextStop)+' · ≈ '+escapeHTML(v.nextArrival.slice(0,5))+' ('+v.etaMinutes+' min)</p><small>Posição estimada · '+(v.geometry==='osm-approximation'?'traçado OSM aproximado':v.geometry==='anchor-approximation'?'interpolação entre referências não consecutivas':'linha reta entre paragens')+'. Sem GPS em tempo real.</small><p><button type="button" data-onboard>🚌 Estou a bordo</button></p>');
   }
   setVehicleCount(vehicles.length);setVehicleDiagnostic(diagnostic);
  }
  tick();const timer=setInterval(tick,5000);
  return()=>{clearInterval(timer);layer.remove();};
 },[showVehicles,data,vehicleIndex,networkFilter,line,osmLine,osmRoutes,routeDirection]);
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

   // Correspondência apenas nominal não confirma qual dos cais recebe a viagem.
   const id=association.status==='position'?association.stop?.stop_id:null;
   if(id&&!stopCache.has(id))stopCache.set(id,{
     lines:linesAtStop(data,id),departures:data?upcoming(data,id,date,4):[]
   });
   const lookup=!id&&data?nameBasedStopTimetable(data,stop.stop_name,date):null;
   const candidateLines=lookup?.lines||[];
   // Mostrar no marcador apenas partidas futuras no dia selecionado.
   // Horas por nome continuam provisórias, sem validar a plataforma.
   const candidateDepartures=nextStopDepartures(lookup?.departures||[],date,4)
     .map(item=>({...item,headsign:item.direction}));
   const schedule=id?stopCache.get(id):{lines:[],departures:candidateDepartures};
   const associationLines=stopLineAssociation(stop,discoveryStops,[...schedule.lines,...candidateLines]);
   return {stop,association,info:{...schedule,nameOnlyEstimate:!id&&!!lookup?.departures?.length,
     routeLines:associationLines.lines,confirmedLines:associationLines.confirmed,
     reportedLines:associationLines.listed,reportedSources:associationLines.sources}};
  });
 },[visible,data,date,osm,discoveryStops]);
 useEffect(()=>{
  const g=markers.current;
  if(!map.current||!g)return;
  g.clearLayers();
  if(showVehicles&&onlyVehicles)return;
  if(networkFilter!=='regional')for(const {stop,association,info} of mappedStops){
   const a=Number(stop.stop_lat),b=Number(stop.stop_lon);
   if(!Number.isFinite(a)||!Number.isFinite(b))continue;
   const marker=L.marker([a,b],{icon:markerIconFor(info),title:stop.stop_name,
     alt:stop.stop_name+'; '+(info.routeLines.length?'linhas identificadas '+info.routeLines.join(', '):'linhas ainda sem correspondência publicada')});
   const name=escapeHTML(stop.stop_name);
   const schedule=info.departures.length?((info.nameOnlyEstimate?'<p class="popup-warning">Horários por nome: sentido e plataforma por confirmar.</p>':'')+info.departures.slice(0,3).map(d=>
     '<div class="popup-departure"><b>Linha '+escapeHTML(d.line)+'</b> · '+escapeHTML((d.estimated?'≈ ':'')+d.time.slice(0,5))+
     ' · '+escapeHTML(d.headsign||'sentido não indicado')+'</div>').join('')):
     association.stop?'<p>Sem partidas programadas disponíveis para esta data/hora.</p>':'<p>Não há horas de passagem validadas para esta plataforma nos dados atuais. Consulta as tabelas oficiais das linhas indicadas abaixo.</p>';
   const official=[...new Set([...info.lines.map(x=>x.line),...info.reportedLines])].filter(x=>/^[1-9]$/.test(String(x)))
     .map(n=>'<a href="https://mobilis.pt/linhas/linha-'+n+'/" target="_blank" rel="noopener noreferrer">Horário oficial linha '+n+'</a>').join(' · ');
   const reported=info.routeLines.length?'<p><b>Linhas identificadas:</b> '+escapeHTML(info.routeLines.join(', '))+'</p><small>As linhas do catálogo são associações por nome ou equivalência de designação; confirma a plataforma e o sentido.</small>':'';
   const warning=info.nameOnlyEstimate?'<p class="popup-warning">Estimativas sujeitas aos horários publicados pela Mobilis. Confirma a plataforma.</p>':association.status==='name-only'?
      '<p class="popup-warning">Correspondência só pelo nome. Confirma a plataforma e o sentido.</p>':
      association.status==='position'?'':'<p class="popup-warning">Paragem OSM sem correspondência segura aos horários digitais.</p>';
   marker.bindPopup('<div class="stop-popup"><strong>🚌 '+name+'</strong>'+warning+reported+schedule+
     '<small>Horários programados, não localização em tempo real.</small>'+(official?'<div class="popup-official">'+official+'</div>':'')+'</div>',{maxWidth:295});
   marker.on('click',()=>setActive(stop));
   g.addLayer(marker);
  }
  if(networkFilter!=='urban'&&!line&&!osmLine)for(const stop of regionalStops){
   if(filter.trim()&&!canonicalStopName(stop.name).includes(canonicalStopName(filter)))continue;
   const marker=L.marker([stop.lat,stop.lon],{icon:L.divIcon({className:'rjp-marker',html:'<span style="background:#176bd0;color:white;border-radius:50%;padding:8px">🚌</span>',iconSize:[40,40],iconAnchor:[20,20]}),title:stop.name});
   marker.bindPopup('<strong>'+escapeHTML(stop.name)+'</strong><p>Intermunicipal · '+escapeHTML(stop.operator||stop.source)+'</p><p>'+escapeHTML((stop.routeNames||[]).join(', ')||'Linhas por confirmar')+'</p><small>Horários e planeamento ainda indisponíveis.</small>');g.addLayer(marker);
  }
 },[mappedStops,networkFilter,regionalStops,filter,line,osmLine,showVehicles,onlyVehicles]);
 useEffect(()=>{if(!map.current||!filter.trim())return;const points=[...(networkFilter==='regional'?[]:visible.slice(0,80).map(s=>[Number(s.stop_lat),Number(s.stop_lon)])),...(networkFilter==='urban'?[]:regionalMatches.slice(0,80).map(s=>[s.lat,s.lon]))].filter(p=>p.every(Number.isFinite));if(points.length===1)map.current.setView(points[0],17,{animate:true});else if(points.length>1)map.current.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:15,animate:true})},[filter,visible,networkFilter,regionalMatches]);
 useEffect(()=>{const layer=routeLayer.current;if(!layer||!map.current)return;layer.clearLayers();
 if(networkFilter==='regional'||regionalLine){
 const regionalIds=new Set(regionalStops.flatMap(s=>s.osmRouteRelations||[]).map(String));
 const regionalRefs=new Set(regionalStops.flatMap(s=>s.routeNames||[]).map(String));
 const routes=allNetworkRoutes.filter(r=>regionalIds.has(String(r.osm_id))||regionalRefs.has(String(r.ref||'').trim()));
 const chosen=regionalLine?routes.filter(r=>String(r.ref||'').trim()===regionalLine):routes;
 const bounds=[];
 for(const r of chosen){for(const coords of r.shape_segments||[]){if(!Array.isArray(coords)||coords.length<2)continue;
 L.polyline(coords,{color:'#fff',weight:12,opacity:.95,interactive:false}).addTo(layer);
 L.polyline(coords,{color:'#176bd0',weight:8,opacity:1}).bindPopup('Intermunicipal '+escapeHTML(r.ref||r.name||'')+' · OSM, percurso por validar').addTo(layer);bounds.push(...coords);
 }}
 if(bounds.length>1)map.current.fitBounds(L.latLngBounds(bounds),{padding:[35,35],maxZoom:14});
 return;
}
if(journey?.legs?.length&&!line&&!osmLine&&!showAllRoutes){
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
   const origin=k===0&&leg===paths[0], destination=k===leg.points.length-1&&leg===paths.at(-1);
   const pinColor=origin?'#15803d':destination?'#dc2626':terminus?'#d97706':color;
   const role=origin?'Origem':destination?'Destino':terminus?'Transbordo':'Paragem';
   L.circleMarker(p.coordinates,{radius:terminus?12:6,color:pinColor,fillColor:terminus?pinColor:'#fff',fillOpacity:1,weight:3})
    .bindTooltip(escapeHTML(role+': '+p.name),{permanent:terminus,direction:'top',offset:[0,-10]})
    .addTo(layer).bindPopup('<strong>'+escapeHTML(p.name)+'</strong><p>Linha '+escapeHTML(leg.line)+' · '+escapeHTML(leg.departure.slice(0,5))+'–'+escapeHTML(leg.arrival.slice(0,5))+'</p><small>Localização aproximada; confirma plataforma e sentido.</small>');
  }
 }
 for(const leg of journey.legs){
 const w=leg.walkingTransfer;if(!w)continue;
 const find=id=>paths.flatMap(p=>p.points).find(p=>p.stopId===id||p.stop_id===id)?.coordinates||(()=>{const s=gtfs.find(s=>s.stop_id===id);return s&&s.stop_lat&&s.stop_lon?[Number(s.stop_lat),Number(s.stop_lon)]:null})();
 const a=find(w.from),b=find(w.to);
 if(a&&b&&[...a,...b].every(Number.isFinite)){
 L.polyline([a,b],{color:'#475569',weight:4,dashArray:'4 8'}).addTo(layer).bindTooltip('Caminhada estimada · '+Math.ceil(w.walkingSeconds/60)+' min');
 bounds.push(a,b);
 }
 }
 if(bounds.length>1)map.current.fitBounds(L.latLngBounds(bounds),{padding:[40,40],maxZoom:15});
 else if(bounds.length===1)map.current.setView(bounds[0],15);
 return;
}
if(showAllRoutes){const bounds=[];const coveredRefs=new Set();for(const route of lines){const real=osmSegmentsForLine(route,osmRoutes);const schematic=directorySchematic(route.route_short_name,lineDirectory,osm);const segments=real.length?real:(schematic.length?schematic:[routeStopSequence(data,route.route_id)]);const color=routeColor(route.route_short_name||route.route_id);for(const coords of segments){if(coords.length<2)continue;L.polyline(coords,{color:'#ffffff',weight:11,opacity:.95,interactive:false}).addTo(layer);L.polyline(coords,{color,weight:7,opacity:1,dashArray:real.length?undefined:'12 7'}).bindPopup('Linha '+escapeHTML(route.route_short_name||route.route_long_name||route.route_id)+(real.length?' · Geometria OpenStreetMap (pode estar incompleta).':' · Traçado esquemático entre paragens; não representa necessariamente as ruas.') ).addTo(layer);bounds.push(...coords)}coveredRefs.add(String(route.route_short_name||'').trim())}
 // Desenhar também as relações OSM que não constam da base parcial de horários.
 // Nunca inferir um trajeto a partir de uma lista de paragens sem coordenadas.
 for(const osmRoute of osmRoutes){
  const ref=String(osmRoute.ref||'').trim();
  if(!ref||coveredRefs.has(ref))continue;
  const color=routeColor(ref);
  for(const coords of osmRoute.shape_segments||[]){
   if(!Array.isArray(coords)||coords.length<2)continue;
   L.polyline(coords,{color:'#fff',weight:10,opacity:.95,interactive:false}).addTo(layer);
   L.polyline(coords,{color,weight:7,opacity:1}).bindPopup('Linha '+escapeHTML(ref)+' · Percurso OpenStreetMap (cobertura por validar).').addTo(layer);
   bounds.push(...coords);
  }
 }
 if(bounds.length>1)map.current.fitBounds(L.latLngBounds(bounds),{padding:[35,35],maxZoom:14});return;}if(osmLine){const chosen=osmRoutes.find(r=>String(r.osm_id)===osmLine);if(chosen){const segments=chosen.shape_segments||[];const group=L.featureGroup();for(const segment of segments){if(segment.length>1)L.polyline(segment,{color:'#e45429',weight:5,opacity:.9}).addTo(group).addTo(layer)}if(group.getLayers().length)map.current.fitBounds(group.getBounds(),{padding:[35,35],maxZoom:15});}return;}if(!data||!line)return;const route=lines.find(r=>r.route_id===line);const matchingRoutes=routeDirection==='all'?osmRoutes:osmRoutes.filter(r=>String(r.osm_id)===routeDirection);const real=osmSegmentsForLine(route,matchingRoutes);const schematic=directorySchematic(route?.route_short_name,lineDirectory,osm);const segments=real.length?real:(schematic.length?schematic:[routeStopSequence(data,line)]);const group=L.featureGroup();for(const coords of segments){if(coords.length<2)continue;L.polyline(coords,{color:'#ffffff',weight:13,opacity:.95,interactive:false}).addTo(layer);L.polyline(coords,{color:routeColor(route.route_short_name||line),weight:9,opacity:1,dashArray:real.length?undefined:'12 7'}).bindPopup(real.length?'Traçado OpenStreetMap; pode estar incompleto.':'Traçado aproximado entre paragens consecutivas identificadas; NÃO segue necessariamente as ruas.').addTo(group).addTo(layer)}if(group.getLayers().length)map.current.fitBounds(group.getBounds(),{padding:[35,35],maxZoom:15})},[data,line,osmLine,osmRoutes,journey,osm,showAllRoutes,lines,routeDirection,networkFilter,regionalLine,regionalStops,allNetworkRoutes,lineDirectory]);
 useEffect(()=>{const layer=gpsLayer.current;if(!layer)return;layer.clearLayers();if(geo){L.circleMarker([geo.lat,geo.lon],{radius:9,color:'#176bd0',fillColor:'#176bd0',fillOpacity:.85}).addTo(layer).bindPopup('A tua localização GPS');map.current?.setView([geo.lat,geo.lon],15)}},[geo]);

 async function reportPassage(){if(!active||crowdBusy)return;if(!crowdLine.trim()){setCrowdMessage('Indica o número da linha.');return}setCrowdBusy(true);setCrowdMessage('A confirmar posição GPS…');try{const pos=await currentLocation();const r=await submitObservedPassage({stop:active,line:crowdLine.trim(),direction:'',lat:pos.lat,lon:pos.lon});setCrowdMessage(r.notice||'Observação recebida.')}catch(e){setCrowdMessage(e.message||'Falha na comunicação.')}finally{setCrowdBusy(false)}}
 const association=active?(mappedStops.find(entry=>entry.stop.stop_id===active.stop_id)?.association||matchMappedStop(active,gtfs)):null;
 const match=association?.status==='position'?association.stop:null;
 const servingLines=match?linesAtStop(data,match.stop_id):[];
 const timetable=useMemo(()=>match&&data?stopTimetableSummary(data,match.stop_id,date):{groups:[],departures:0,lines:[]},[data,match?.stop_id,date.getTime()]);
 const byName=useMemo(()=>!match&&active&&data?nameBasedStopTimetable(data,active.stop_name,date):null,[data,active?.stop_name,match?.stop_id,date.getTime()]);
 const afterTimeGroups=useMemo(()=>timetableFromTime(timetable.groups,date),[timetable,date.getTime()]);
 const displayGroups=showAllDay?timetable.groups:afterTimeGroups;
 const displayByName=useMemo(()=>timetableFromTime(byName?.groups||[],date,{allDay:showAllDay}),[byName,date.getTime(),showAllDay]);
 const futureCount=countTimetableDepartures(afterTimeGroups);
 const activeGroups=match?displayGroups:displayByName;
 const activeSummary=useMemo(()=>summariseTimetableGroups(activeGroups),[activeGroups]);
 const reportedForActive=active?stopLineAssociation(active,discoveryStops,[...servingLines,...(byName?.lines||[])]):null;
 const nearbyAlternatives=useMemo(()=>active?nearbyIdentifiedStops(active,osm,discoveryStops):[],[active,osm,discoveryStops]);
 const identifiedCount=mappedStops.filter(x=>x.info.routeLines.length>0).length;
 const closest=closestMapped.slice(0,5).map(({stop})=>stop);
 const mappedCount=mappedStops.filter(x=>x.association.stop).length;
 const selectedDistance=geo&&active?nearbyStops([active],geo.lat,geo.lon,1)[0]?.distance:null;
 function focusStop(stop){setActive(stop);const lat=Number(stop.stop_lat),lon=Number(stop.stop_lon);if(map.current&&Number.isFinite(lat)&&Number.isFinite(lon)){map.current.setView([lat,lon],17,{animate:true})}}

 const onboard=onboardVehicles.find(v=>v.id===onboardId);
 const destination=onboard?.remainingStops?.find(v=>String(v.sequence)===exitStop);
 useEffect(()=>{if(followBus&&onboard)map.current?.panTo([onboard.lat,onboard.lon]);},[followBus,onboard]);
 return <div className="panel map-panel"><div className="map-heading"><div><h2>Mapa interativo de Leiria</h2><p className="muted">Símbolos grandes com linhas e próxima partida programada. Toca numa paragem para veres os horários e sentidos disponíveis.</p></div><button onClick={onLocate} className="gps-button">◎ GPS</button></div>
 <div className="mapactions"><button type="button" aria-pressed={showVehicles} onClick={()=>setShowVehicles(v=>!v)}>{showVehicles?"Ocultar autocarros":"Mostrar autocarros"}</button>{showVehicles&&<button type="button" aria-pressed={onlyVehicles} onClick={()=>setOnlyVehicles(v=>!v)}>{onlyVehicles?'Mostrar paragens':'Apenas autocarros'}</button>}<button type="button" aria-pressed={showAllRoutes} onClick={()=>{setShowAllRoutes(v=>!v);setLine('');setOsmLine('')}}>{showAllRoutes?'Ocultar rede de linhas':'🌈 Ver todas as linhas no mapa'}</button><select aria-label="Rede de transportes" value={networkFilter} onChange={e=>{setNetworkFilter(e.target.value);setRegionalLine('');setActive(null);setLine('');setOsmLine('');setShowAllRoutes(false)}}><option value="all">Todas as redes</option><option value="urban">Urbanos Mobilis</option><option value="regional">Intermunicipais</option></select><input aria-label="Procurar paragem" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="🔎 Procurar paragem..."/><select aria-label="Estado das paragens" value={coverageFilter} onChange={e=>setCoverageFilter(e.target.value)}><option value="all">Todas as paragens</option><option value="published">Com horas publicadas</option><option value="estimated">Com horas estimadas ≈</option><option value="no-times">Sem horas digitais</option><option value="no-lines">Sem linhas documentadas</option></select>{networkFilter==='regional'&&<select aria-label="Filtrar linha intermunicipal" value={regionalLine} onChange={e=>setRegionalLine(e.target.value)}><option value="">Todas as linhas intermunicipais cartografadas</option>{[...new Set(regionalStops.flatMap(s=>s.routeNames||[]))].sort().map(ref=><option key={ref} value={ref}>Linha {ref}</option>)}</select>}<select aria-label="Filtrar linha" value={line} onChange={e=>{setLine(e.target.value);setRouteDirection('all');if(e.target.value){setOsmLine('');setShowAllRoutes(false)}}}><option value="">Todas as linhas</option>{lines.map(l=><option key={l.route_id} value={l.route_id}>Linha {l.route_short_name||l.route_long_name}</option>)}</select>{line&&selectedOsmDirections.length>1&&<select aria-label="Sentido da linha" value={routeDirection} onChange={e=>setRouteDirection(e.target.value)}><option value="all">Ambos os sentidos OSM</option>{selectedOsmDirections.map(r=><option key={r.osm_id} value={String(r.osm_id)}>{r.from&&r.to?r.from+' → '+r.to:routeDescription(r)}</option>)}</select>}<select aria-label="Traçado OSM" value={osmLine} onChange={e=>{setOsmLine(e.target.value);if(e.target.value){setLine('');setShowAllRoutes(false)}}}><option value="">Traçados Mobilis OSM ({osmRoutes.length})</option>{osmRoutes.map(r=><option key={r.osm_id} value={r.osm_id}>{routeDescription(r)}</option>)}</select><button onClick={()=>refresh(true)} disabled={busy}>{busy?'A atualizar…':'↻ Atualizar'}</button>{(filter||line||osmLine||coverageFilter!=='all')&&<button type="button" onClick={()=>{setFilter('');setCoverageFilter('all');setLine('');setOsmLine('');setShowAllRoutes(false)}}>Limpar filtros</button>}</div>{showAllRoutes&&<div className="journey-lines" aria-label="Legenda das linhas Mobilis" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'10px 0'}}>{lines.map(route=><button key={'legend-'+route.route_id} type="button" style={{border:'2px solid '+routeColor(route.route_short_name||route.route_id),borderRadius:8,padding:'6px 11px',background:routeColor(route.route_short_name||route.route_id),color:'#ffffff',fontWeight:800,boxShadow:'0 2px 6px #0004'}} onClick={()=>{setShowAllRoutes(false);setOsmLine('');setLine(route.route_id)}}>Linha {route.route_short_name||route.route_long_name||route.route_id}</button>)}</div>}{line&&<p className="map-warning">A mostrar {visible.length} paragem(ns) com a linha {selectedLineName} documentada por nome ou horário. O filtro não confirma a plataforma nem o serviço para a data selecionada.</p>}
 
 {journey?.legs?.length&&<div className="journey-map-summary"><strong>{journey.estimated?'≈ ':''}{journey.legs[0].departure.slice(0,5)} → {journey.legs.at(-1).arrival.slice(0,5)}</strong><span>{journey.journeyMinutes} min de viagem · {journey.ridingMinutes} min no autocarro · {journey.waitingMinutes} min de espera · {journey.transfers} transbordo(s)</span><div className="journey-lines">{journey.legs.map((leg,i)=><span key={leg.tripId+'-'+i} style={{borderColor:routeColor('mobilis-'+leg.line)}}>Linha {leg.line}{leg.estimated?' ≈':''}</span>)}</div><small>Traçados esquemáticos pelos pontos disponíveis; não representam as ruas nem confirmam a plataforma. Horas com ≈ são estimadas.</small><button type="button" onClick={onPlan}>Alterar origem ou destino</button></div>}{filter.trim()&&<div className="stop-search-results"><strong>{(networkFilter==='regional'?0:visible.length)+(networkFilter==='urban'?0:regionalMatches.length)} paragem(ns) encontradas</strong>{networkFilter!=='urban'&&regionalMatches.slice(0,8).map(s=><button key={'regional-'+s.source+'-'+s.id} onClick={()=>map.current?.setView([s.lat,s.lon],17,{animate:true})}>🚌 {s.name} <span>Intermunicipal</span></button>)}{(networkFilter==='regional'?[]:visible.slice(0,8)).map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>📍 {s.stop_name} <span>Ver no mapa</span></button>)}</div>}{onboardId&&<section style={{padding:12,border:'1px solid #b9c9da',borderRadius:12,margin:'8px 0'}}><div className="mapactions"><strong>🚌 A bordo {onboard?'· Linha '+onboard.line:''}</strong><button type="button" onClick={()=>{setOnboardId('');setFollowBus(false);setExitStop('')}}>Terminar</button></div>{onboard?<><p><b>Próxima paragem:</b> {onboard.nextStop} · ≈ {onboard.etaMinutes} min</p><progress max={100} value={onboard.progress}/><label>Paragem onde vou sair<select value={exitStop} onChange={e=>setExitStop(e.target.value)}><option value="">Escolher paragem</option>{onboard.remainingStops.map(p=><option key={p.sequence} value={p.sequence}>{p.name} · {p.time}</option>)}</select></label>{destination&&<p>Chegada prevista: {destination.time} · ≈ {destination.minutes} min</p>}<label>Pré-aviso de saída<select value={lead} onChange={e=>setLead(Number(e.target.value))}>{[3,5,10,15].map(n=><option key={n} value={n}>{n} min antes</option>)}</select></label>{destination&&destination.minutes<=lead&&<p role="status"><b>Prepara a saída: chegada prevista em {destination.minutes} min.</b></p>}{exitStop&&!destination&&<p role="status">A hora prevista da paragem selecionada já passou ou está indisponível.</p>}<div className="mapactions"><button type="button" onClick={()=>setFollowBus(v=>!v)}>{followBus?'Parar seguimento':'Seguir autocarro no mapa'}</button><button type="button" onClick={onLocate}>◎ Meu GPS</button></div></>:<p>Posição estimada indisponível neste momento.</p>}<small>Horários estimados, sem GPS do autocarro. Pré-aviso visual com a aplicação aberta.</small></section>}<div ref={div} className="leaflet-map" aria-label="Mapa interativo de paragens de Leiria"/>
 {osmLine&&<p className="map-warning">Traçado das ruas proveniente das relações OpenStreetMap; pode estar incompleto, não garante serviço Mobilis nem horários. Os troços descontínuos não são ligados artificialmente.</p>}{showAllRoutes&&<p className="map-warning">Rede Mobilis: cada linha tem uma cor própria. Traçados contínuos usam geometrias OSM identificadas; os tracejados são esquemáticos entre paragens GTFS. As geometrias OSM podem estar incompletas. Toca numa linha para a identificar.</p>}{line&&<p className="map-warning">Traçado contínuo quando existe geometria OSM correspondente; caso contrário, tracejado esquemático entre paragens GTFS. A geometria OSM não garante o percurso oficial.</p>}
 {active&&<div className="mapdetails"><button type="button" className="map-pin-favourite" onClick={()=>onToggleFavorite(active.stop_id)}>{favoriteIds.includes(active.stop_id)?"📌 Paragem fixada · Remover":"☆ Fixar esta paragem nos atalhos"}</button><button className="close-map" aria-label="Fechar informação" onClick={()=>{setActive(null);setCrowdMessage('')}}>×</button><h3>🚌 {active.stop_name}</h3><small>OpenStreetMap · {active.ref?'Ref. '+active.ref:'sem referência publicada'} · {Number(active.stop_lat).toFixed(5)}, {Number(active.stop_lon).toFixed(5)}</small>{Number.isFinite(selectedDistance)&&<p className="stop-distance">📍 A cerca de <b>{Math.round(selectedDistance)} m</b> em linha reta da tua posição GPS. O percurso a pé pode ser maior.</p>}{(timetable.groups.length>0||byName?.groups?.length>0)&&<div className="stop-data-summary"><strong>Informação disponível nesta data:</strong> {activeSummary.lines.length} linha(s) · {activeSummary.directions} sentido(s) · {activeSummary.published} passagens digitalizadas · {activeSummary.estimated} estimativas ≈. <small>{match?'Ligação ao ponto por nome e posição.':'Consulta por designação; plataforma por confirmar.'}</small></div>}{(timetable.groups.length>0||byName?.groups?.length>0)&&<div className="timetable-scope"><span>Data e hora do planeador: <b>{date.toLocaleDateString('pt-PT')} · {date.toTimeString().slice(0,5)}</b></span><div className="timetable-scope-actions"><button type="button" className={!showAllDay?'active':''} onClick={()=>setShowAllDay(false)}>A partir da hora</button><button type="button" className={showAllDay?'active':''} onClick={()=>setShowAllDay(true)}>Dia completo</button></div><small>Linhas separadas por sentido; ≈ indica interpolação. Horários dependentes das tabelas Mobilis.</small></div>}{match?<><p><b>{association.status==='position'?'Paragem associada por posição e nome':'Correspondência apenas pelo nome'}</b> · {match.stop_name}. {association.status==='name-only'?'A posição GTFS não está publicada: confirma a plataforma e o sentido antes de embarcar.':`Distância entre dados: ${Math.round(match.distance)} m.`}</p>{servingLines.length>0&&<div className="served-lines"><strong>Linhas com horários nesta paragem:</strong>{servingLines.map(l=><span key={l.id} className="line-chip" title={l.description}>{l.line}</span>)}</div>}<b>Horários de passagem nesta paragem</b><p className="muted">{timetable.departures} passagem(ns) digitalizadas para esta data, {futureCount} a partir da hora selecionada. Cada hora corresponde a esta paragem, não à partida do terminal. ≈ significa estimativa entre duas referências oficiais.</p>{displayGroups.map(g=><div className="timetable-group" key={g.line+'-'+g.direction}><strong>Linha {g.line} · {g.direction}</strong><div className="departures">{g.departures.map((p,i)=><span key={p.tripId+'-'+i}>{p.estimated?'≈ ':''}{p.time.slice(0,5)}</span>)}</div>{g.sources.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Tabela oficial ↗</a>)}</div>)}{!displayGroups.length&&<p className="muted">{timetable.groups.length?'Não há mais passagens digitalizadas após a hora escolhida. Seleciona «Dia completo» para consultar as anteriores.':'Sem horas de passagem digitalizadas nesta paragem para este dia. Isso não significa que não existam autocarros; consulta a tabela oficial do operador.'}</p>}</>:<div>{reportedForActive?.lines?.length>0&&<p><b>Linhas identificadas para esta designação:</b> {reportedForActive.lines.join(', ')}. As linhas por nome ou equivalência são provisórias; confirma o sentido e a plataforma.</p>}{byName?.groups?.length>0&&<div className="provisional-timetable"><strong>Passagens {byName.viaEquivalence?'por designação equivalente':'associadas pelo nome da paragem'} (por confirmar)</strong><p className="muted">Plataforma e sentido por confirmar. Estas horas dependem dos horários publicados pela Mobilis; ≈ indica interpolação, não localização em tempo real.</p>{displayByName.map(g=><div className="timetable-group" key={g.line+'-'+g.direction}><strong>Linha {g.line} · {g.direction}</strong><div className="departures">{g.departures.map((p,i)=><span key={p.tripId+'-'+i}>{p.estimated?'≈ ':''}{p.time.slice(0,5)}</span>)}</div>{g.sources.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Horário Mobilis ↗</a>)}</div>)}</div>}{byName?.groups?.length>0&&!displayByName.length&&<p className="muted">Sem passagens depois da hora selecionada. Consulta o dia completo para ver os horários anteriores.</p>}<p className="muted">Localização cartografada. {association?.status==='ambiguous'?'Há várias paragens GTFS com o mesmo nome; não foi possível confirmar qual corresponde a esta plataforma.':'Não há correspondência segura com os horários disponíveis.'} As linhas indicadas no catálogo são informativas e não garantem a plataforma nem a hora de passagem. Consulta os horários oficiais abaixo e confirma o sentido antes de embarcar.</p>{reportedForActive?.lines?.length>0&&<div className="popup-official"><strong>Horários oficiais das linhas indicadas:</strong> {reportedForActive.lines.filter(n=>/^[1-9]$/.test(String(n))).map(n=><a key={n} href={'https://mobilis.pt/linhas/linha-'+n+'/'} target="_blank" rel="noopener noreferrer">Linha {n} ↗ </a>)}</div>}</div>}{!match&&nearbyAlternatives.length>0&&<section className="nearby-alternatives"><h4>Paragens próximas com linhas identificadas</h4><p className="muted">Alternativas por proximidade em linha reta, não são transbordos nem percursos pedonais verificados. Confirma o lado da rua, o sentido e os horários da Mobilis.</p>{nearbyAlternatives.map(option=><button key={option.stop_id} type="button" onClick={()=>focusStop(option)}>📍 {option.stop_name} · {Math.round(option.distance)} m · Linha(s) {option.identifiedLines.join(', ')} · Ver no mapa</button>)}</section>}<div className="crowd-panel"><b>🚌 Viste um autocarro passar?</b><p className="muted">Registo voluntário e anónimo. Apenas a menos de 75 m da paragem; não confirma a chegada em tempo real.</p><div className="mapactions"><input aria-label="Número da linha observada" placeholder="Linha (ex.: 7)" value={crowdLine} onChange={e=>setCrowdLine(e.target.value)} maxLength={10}/><button disabled={!crowdAvailable()||crowdBusy} onClick={reportPassage}>{crowdBusy?'A registar…':'Vi o autocarro passar'}</button></div>{!crowdConfigured&&<small>Firebase por configurar — registo comunitário indisponível.</small>}{crowdConfigured&&!crowdAvailable()&&<small>Registo comunitário Android pendente da integração nativa Play Integrity; usa a WebApp para testar.</small>}{crowdMessage&&<p role="status">{crowdMessage}</p>}</div><div className="mapactions"><button onClick={()=>onPick('from',match||active)}>📍 Usar como origem</button><button onClick={()=>onPick('to',match||active)}>🏁 Usar como destino</button><button onClick={onPlan}>Ver percursos</button><a className="walk-button" href={walkingDirectionsUrl(active,geo)||undefined} target="_blank" rel="noopener noreferrer">🚶 Como chegar a pé</a></div></div>}
 {geo&&closest.length>0&&<div className="closest"><b>Paragens próximas</b>{closestRoutable&&<button className="nearest-routable" onClick={()=>{onPick('from',closestRoutable.association.stop);onPlan()}}>🚌 Planear desde {closestRoutable.stop.stop_name} · {Math.round(closestRoutable.stop.distance)} m em linha reta</button>}{closest.map(s=><button key={s.stop_id} onClick={()=>focusStop(s)}>{s.stop_name} · {Math.round(s.distance)} m</button>)}</div>}
 <details className="map-information"><summary>Informação do mapa</summary>{networkFilter!=='urban'&&<p className="map-warning">{regionalStops.length?`${regionalStops.length} paragens regionais validadas · marcadores azuis. Horários regionais ainda indisponíveis.`:'Rede intermunicipal: dados ainda por validar e importar.'}</p>}<p className="map-legend">🟨 Linhas e horários identificados · 🚌 Paragem cartografada sem horário associado · ≈ Hora interpolada · Dados publicados pela Mobilis; não em tempo real.</p>{showVehicles&&<p className="map-warning" role="status">{routeDirection!=='all'?"Seleciona ambos os sentidos para ver estimativas; associação ao sentido OSM ainda não validada.":vehicleCount+" autocarro(s) estimado(s) · círculos coloridos por linha · sem GPS real."}</p>}{showVehicles&&<details><summary>Diagnóstico de cobertura (todas as linhas)</summary>{Object.entries(vehicleDiagnostic).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([n,d])=><div key={n}>Linha {n}: {d.mapped}/{d.scheduled} serviços localizados</div>)}<small>Serviços previstos nos horários digitais; não confirma circulação real. Contagem anterior aos filtros do mapa.</small></details>}<div className="osm-status">{status} · {visible.length} visíveis · {audit.summary.withLines}/{audit.summary.total} com linhas documentadas · {audit.summary.withPublishedReference} com horas publicadas por nome · {audit.summary.withEstimatedReference} com horas estimadas por nome · {audit.summary.withoutDocumentedLines} por associar · Plataforma/sentido por confirmar</div><p className="muted map-credit">Seleciona qualquer paragem no mapa como origem ou destino. Sem correspondência segura aos horários, o planeador indica a limitação e não inventa viagens. Mapas © OpenStreetMap contributors. Os pontos OSM não confirmam serviço ativo. Linhas, destinos e horários são mostrados apenas se houver dados de horários associados, não em tempo real.</p></details></div>;
}
