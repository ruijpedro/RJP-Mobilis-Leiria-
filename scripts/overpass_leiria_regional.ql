[out:json][timeout:120];
area["name"="Leiria"]["boundary"="administrative"]["admin_level"="7"]->.municipality;
node(area.municipality)["highway"="bus_stop"]->.busStops;
rel(bn.busStops)["route"="bus"]->.routes;
(.routes; >;);
out body center;
