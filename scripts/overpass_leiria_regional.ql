[out:json][timeout:90];
area["name"="Leiria"]["boundary"="administrative"]["admin_level"="7"]->.municipality;
// Paragens do concelho, incluindo plataformas PTv2.
(
  node(area.municipality)["highway"="bus_stop"];
  node(area.municipality)["public_transport"="platform"]["bus"="yes"];
  node(area.municipality)["public_transport"="stop_position"]["bus"="yes"];
)->.localStops;
// Encontrar carreiras por ligação direta à paragem.
rel(bn.localStops)["route"="bus"]->.routes;
// Não descarregar milhares de nós das estradas: apenas os membros nó.
node(r.routes)->.routeNodes;
(.localStops; .routes; .routeNodes;);
out body center;
