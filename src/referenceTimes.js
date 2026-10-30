// Referência independente: não confundir com horário oficial nem com previsão em tempo real.
// Dados publicados pela Moovit para o serviço da linha 7 (via Pousos).
export const REFERENCE_TIMES = Object.freeze({
  line: '7', stop: 'Escola Básica do Vidigal', direction: 'Circular via Pousos',
  days: 'Dias úteis', passages: Object.freeze(['07:17','08:07']),
  source: 'https://moovitapp.com/index/pt/transportes_p%C3%BAblicos-time-7-Lisboa-2460-3784393-309401193-10954025-0',
  sourceKind: 'terceiro', verifiedAgainstOfficial: false,
  warning: 'Referência externa. Confirma no operador antes de viajar. Não usada pelo planeador.'
});
export function canRouteFromReference(reference){ return reference?.verifiedAgainstOfficial===true && reference?.hasStopCoordinates===true && reference?.hasCompleteTrips===true; }
