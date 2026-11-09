/**
 * RJP Mobilis — registo de proveniência de horários.
 * Fontes verificadas em 2026-11-08. Nenhum horário é inferido neste módulo.
 */
export const MOBILIS_SOURCES = Object.freeze([
  { id: 'mobilis-official', name: 'Mobilis', url: 'https://mobilis.pt/', kind: 'official', realtime: false, reuse: 'permission-required', priority: 100 },
  { id: 'mobilis-line-6', name: 'Mobilis — linha 6', url: 'https://mobilis.pt/linhas/linha-6/', kind: 'official', realtime: false, validFrom: '2026-09-01', reuse: 'permission-required', priority: 100 },
  { id: 'leiria-lovers', name: 'Leiria Lovers', url: 'https://leirialovers.pt/mobilidade/', kind: 'secondary', realtime: false, reuse: 'permission-required', priority: 40 },
  { id: 'parahub', name: 'Parahub — fontes', url: 'https://parahub.io/pt/about/sources', kind: 'catalog', realtime: false, reuse: 'check-per-feed', priority: 20 }
]);

export const SCHEDULE_STATUS = Object.freeze({
  OFFICIAL: 'official',
  SECONDARY: 'secondary',
  ESTIMATED: 'estimated',
  REALTIME: 'realtime',
  UNKNOWN: 'unknown'
});

/** Só dados efetivamente recebidos de um feed em tempo real podem ter a etiqueta realtime. */
export function classifyDeparture(departure = {}) {
  const hasRealtime = departure.realtime === true && typeof departure.realtimeSource === 'string' && departure.realtimeSource.length > 0;
  if (hasRealtime) return SCHEDULE_STATUS.REALTIME;
  if (departure.estimated === true || departure.interpolated === true) return SCHEDULE_STATUS.ESTIMATED;
  if (departure.sourceId === 'mobilis-official' || departure.sourceId === 'mobilis-line-6') return SCHEDULE_STATUS.OFFICIAL;
  if (typeof departure.sourceId === 'string' && departure.sourceId.length > 0) return SCHEDULE_STATUS.SECONDARY;
  return SCHEDULE_STATUS.UNKNOWN;
}

export function departureLabel(departure = {}) {
  const status = classifyDeparture(departure);
  return {
    official: 'Horário oficial programado',
    secondary: 'Horário programado — fonte secundária',
    estimated: 'Hora estimada — não é tempo real',
    realtime: 'Informação em tempo real',
    unknown: 'Horário por confirmar'
  }[status];
}

/** Catálogo de descoberta para expansão intermunicipal. Não é um feed de horários. */
export const REGIONAL_DISCOVERY_SOURCES = Object.freeze([
  {id:'imt-nap-stepp',name:'IMT NAP / STePP',url:'https://www.nap-portugal.imt-ip.pt/nap/multimodal',kind:'open-data-catalog',coverage:'Portugal',formats:['shapefile'],reuse:'verify-dataset-license',hasVerifiedSchedules:false},
  {id:'stepp-map',name:'STePP SIGWeb',url:'https://www.stepp.pt/sigweb/',kind:'public-map',coverage:'Portugal',formats:['shapefile'],reuse:'verify-dataset-license',hasVerifiedSchedules:false},
  {id:'cimrl',name:'CIM Região de Leiria — Mobilidade',url:'https://cimregiaodeleiria.pt/mobilidade/mobilidade-regiao-de-leiria/',kind:'official-operator-directory',coverage:'Região de Leiria',operators:['Rodoviária do Lis','Mobilis','TUMG','Pombus'],reuse:'check-per-operator',hasVerifiedSchedules:false}
]);
