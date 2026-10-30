// Datas de serviço devem seguir a hora local do dispositivo, não UTC.
export function localServiceDate(date = new Date()) {
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function hasUsableTrips(data) {
  if (!data) return false;
  const trips = new Set((data.trips||[]).map(t=>t.trip_id));
  const times = new Map();
  for (const t of data.stopTimes||[]) {
    if (!trips.has(t.trip_id) || !t.stop_id || !/^\d{1,2}:\d{2}:\d{2}$/.test(t.departure_time||'')) continue;
    times.set(t.trip_id,(times.get(t.trip_id)||new Set()).add(t.stop_id));
  }
  return [...times.values()].some(stops=>stops.size>=2);
}
