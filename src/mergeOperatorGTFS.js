/** Combina feeds sem colidir identificadores nem alterar o feed urbano. */
export function mergeOperatorGTFS(base, feed, operatorId) {
  const prefix=String(operatorId||'').trim();
  if(!/^[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('Identificador de operador inválido');
  if(!feed?.stops?.length||!feed?.routes?.length||!feed?.trips?.length||!feed?.stopTimes?.length) throw new Error('Feed GTFS incompleto');
  const ns=id=>id==null||id===''?id:prefix+':'+id;
  const fields={stops:['stop_id','parent_station'],routes:['route_id','agency_id'],trips:['trip_id','route_id','service_id','shape_id','block_id'],stopTimes:['trip_id','stop_id'],calendar:['service_id'],calendarDates:['service_id']};
  const out={...base};
  for(const [key,ids] of Object.entries(fields)){
    const rows=(feed[key]||[]).map(row=>{
      const copy={...row,operatorId:prefix};
      for(const id of ids)if(id in copy)copy[id]=ns(copy[id]);
      return copy;
    });
    out[key]=[...(base?.[key]||[]).filter(row=>row.operatorId!==prefix),...rows];
  }
  return out;
}
