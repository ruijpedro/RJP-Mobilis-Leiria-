// Abre navegação pedonal externa; o cálculo do trajeto é feito pelo serviço de mapas.
export function walkingDirectionsUrl(stop, geo) {
  const lat = Number(stop?.stop_lat), lon = Number(stop?.stop_lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return null;
  const dest = encodeURIComponent(`${lat},${lon}`);
  const origin = geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lon)
    ? `&origin=${encodeURIComponent(`${geo.lat},${geo.lon}`)}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=walking`;
}
