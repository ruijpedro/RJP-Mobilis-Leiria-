// Catálogo de fontes, não representa uma base de horários digitalizada.
export const OFFICIAL_LINES = [
 {id:'1',name:'Circular Leiria — sentido Estação'},
 {id:'2',name:'Circular Urbana — sentido Hospital'},
 {id:'3',name:'Ponte da Pedra / Gândara / Telheiro'},
 {id:'4',name:'Leiria — Andrinos'},
 {id:'5',name:'Leiria — Pinheiros'},
 {id:'6',name:'Leiria — Parceiros (Azoia)'},
 {id:'7',name:'Circular Leiria — Casal dos Matos / Pousos (Vidigal e Touria)'},
 {id:'8',name:'Circular Leiria — Cortes'},
 {id:'9',name:'Leiria — Campus 2 ULO'}
].map(line=>({...line,url:`https://mobilis.pt/linhas/linha-${line.id}/`}));
export function getLine(id){return OFFICIAL_LINES.find(line=>line.id===String(id));}
export function parseManifest(m){return m&&Array.isArray(m.lines)?m.lines.filter(x=>/^\d+$/.test(String(x.id))&&/^https:\/\/mobilis\.pt\//.test(x.page||'')):[];}
