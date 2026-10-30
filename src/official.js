// Transcrição conferida visualmente do PDF oficial Mobilis Linha 7, válido desde 01-09-2026.
export const OFFICIAL_LINES = Array.from({length:9},(_,i)=>({number:i+1,url:`https://mobilis.pt/linhas/linha-${i+1}/`}));
export const LINE7_PDF='https://mobilis.pt/media/2026/08/00-1857-356-03-CM-Leiria-PDF-LINHA-7.pdf';
export const VIDIGAL_L7={stop:'Vidigal',line:'7',direction:'Casal dos Matos / Pousos',validFrom:'2026-09-01',source:LINE7_PDF,weekdays:['07:17','08:07','09:02','12:17','13:17','14:17','16:42','17:42','18:42','19:42'],weekends:['07:17','13:17','18:42']};
export function officialDepartures(date=new Date()){
 const day=date.getDay();return (day===0||day===6?VIDIGAL_L7.weekends:VIDIGAL_L7.weekdays).map(time=>({time,line:'7',destination:VIDIGAL_L7.direction,source:LINE7_PDF}));
}
