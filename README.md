# RJP Mobilis Leiria V1.7 — atualização automática

Aplicação WebApp e Android. Ao abrir, a aplicação procura automaticamente o catálogo `/data/mobilis-sources.json` e, se existir URL oficial GTFS validado, descarrega o arquivo, guarda os horários em IndexedDB e calcula percursos origem/destino, transbordos e horas programadas de chegada. Revalida a cada 6 horas e permite atualização manual por botão. Mantém os dados anteriores em caso de falha.

## Limite atual de cobertura

**Ainda não há uma fonte GTFS completa da Mobilis confirmada.** O catálogo incluído tem `feedUrl: null`, logo a atualização não consegue ainda alimentar o planeador de toda a rede. A app inclui consulta às páginas oficiais 1 a 9 e alguns horários pontuais históricos, que exigem confirmação. Não se apresentam tempos fictícios de viagens.

## Publicação sem download de horários pelo utilizador

- Publicar a WebApp (`dist/`) em hospedagem HTTPS (ex.: GitHub Pages). A WebApp consulta automaticamente `/data/mobilis-sources.json` nesse domínio.
- O workflow `Verificar fontes Mobilis` atualiza duas vezes por dia o catálogo e confirma páginas do operador.
- Quando obtiver URL GTFS **validado e autorizado** definir a variável de repositório `MOBILIS_VERIFIED_GTFS_URL` (Settings → Secrets and variables → Actions → Variables). O workflow publicará o URL no catálogo; a fonte deve permitir CORS na WebApp.
- **Atenção:** atualizar o ficheiro no repositório não atualiza por si uma WebApp já publicada; configurar o deployment contínuo a partir de `main`.
- No Android encapsulado via Capacitor, `/data/...` aponta para ativos empacotados; para atualizações sem APK é preciso hospedar o catálogo externamente e configurar o URL em `src/autoSource.js`. Uma alternativa é usar o mesmo domínio HTTPS da WebApp. Não afirmar atualização remota em Android sem essa configuração.

Para testar: `npm install`, `npm test`, `npm run build`. Para APK: GitHub Actions → WebApp e Android. O processo não foi validado nesta sessão com npm devido a acesso limitado à rede.

## V1.8 — verificação automática de fontes

O workflow `Verificar fontes Mobilis` consulta as nove páginas oficiais duas vezes por dia, descobre anexos PDF/SVG e testa se os endereços realmente respondem. O catálogo `public/data/mobilis-sources.json` expõe os estados na interface. **Isto não é extração automática de tabelas** e não substitui um GTFS oficial. A recolha e validação de tempos entre paragens continua pendente. Sem estes dados, o planeador indica ausência de ligação confirmada e não inventa horas de chegada.

**Nota:** o PDF da linha 7 anteriormente registado pode devolver HTTP 404. A V1.8 assinala a transcrição histórica como não verificada e liga à página oficial em vez do PDF quebrado. Para concluir a funcionalidade solicitada é necessário obter horários completos e atuais, incluindo a sequência de paragens e calendário de cada circulação, e publicá-los num GTFS validado.
