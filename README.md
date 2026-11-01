# RJP Mobilis Leiria V1.9 RC1 — Consolidação e compilação

Esta entrega reúne a V1.8.3 e reforça a compilação automática da WebApp e APK Android (debug).

**Importante:** devido a erro DNS EAI_AGAIN ao aceder a registry.npmjs.org, não foi possível instalar dependências nem executar localmente a compilação web/Android. A compilação deve ser validada em GitHub Actions. Não está incluída uma APK pré-compilada.

## Utilização

1. Publicar os ficheiros no repositório GitHub (branch `main`).
2. Abrir Actions > Compilar WebApp e APK Android > Run workflow.
3. Descarregar o artefacto WebApp e a APK debug no fim da execução.
4. Se algum passo falhar, consultar o log desse passo (npm, Vite, Capacitor ou Gradle).

## Cobertura de dados

Amostra de horários programados das linhas 1, 7 e 8; restantes linhas com cobertura parcial de trajetos. Os cálculos usam somente passagens registadas, e os atrasos são introduzidos pelo utilizador. Sem garantia de tempos reais.

## Código

Mantêm-se os ficheiros do projeto anterior: `src`, `public`, `data`, `scripts`, `tests` e workflows de fontes OSM.

# RJP Mobilis Leiria V1.5

Planeador independente de transportes urbanos de Leiria (WebApp e Android).

## Instalação

```sh
npm install
npm test
npm run dev
npm run build
```

No GitHub Actions, o workflow gera `dist/` e uma APK Android de depuração. A app utiliza React, Vite e Capacitor.

## Funcionalidades

- Importação manual de GTFS Schedule `.zip` e persistência offline em IndexedDB.
- Pesquisa de paragens e de locais conhecidos (ex.: Teatro José Lúcio da Silva, Vidigal, Campo Amarelo), associando nomes a paragens quando existem correspondências.
- Planeamento por horário e data, viagens diretas ou até 2 transbordos, horários de passagem.
- Localização GPS de paragens mais próximas, favoritos e partida pela paragem escolhida.

## Limitações e transparência

**Não inclui dados GTFS oficiais integrados**: o operador deve disponibilizar ficheiro autorizado. Não há garantia de disponibilidade de GTFS público ou informação em tempo real. Nomes de locais são aproximações textuais às paragens e não implicam que o destino seja na própria paragem. A app não verifica percursos pedonais, nem transbordos a pé entre paragens distintas. O horário é programado e pode divergir do real.

Fonte de consulta: https://mobilis.pt/linhas/linha-7/

## V1.3 — Mapa OpenStreetMap

- Novo separador **Mapa** com Leaflet e paragens de Leiria obtidas automaticamente pela API Overpass (consultas ocasionais; fontes com tolerância a falhas).
- Inclui `highway=bus_stop` e `public_transport=platform` com `bus=yes`, incluindo plataformas cartografadas como *ways*.
- Pesquisa por nome, toque numa paragem e seleção como origem/destino.
- Com um ficheiro GTFS previamente importado, tenta associar cada paragem OSM a uma paragem GTFS com nome compatível num raio de 90 metros; só então mostra próximas partidas programadas e destinos.
- Dados OSM guardados localmente durante sete dias, com botão para atualização manual e possibilidade de reutilizar cache em falha de rede.
- Os pontos OSM não são, por si, prova de serviço ativo; sem GTFS não há horários confirmados, nem linhas ou rotas inventadas.
- Base cartográfica © OpenStreetMap contributors (ODbL), com atribuição no mapa. Fonte de horários: GTFS fornecido pelo utilizador.

**Nota:** a consulta da área `admin_level=6` abrange o concelho, e não só a rede urbana. APIs Overpass públicas têm disponibilidade variável. Instalar dependências com `npm install` antes de `npm test` e `npm run build`. Não foi possível executar build local neste ambiente porque o acesso ao npm registry falhou (EAI_AGAIN).

## V1.3 — Mapa principal
- O ecrã inicial é agora o **Mapa**.
- Agrupamento de marcadores com Leaflet.markercluster e expansão com zoom.
- Pesquisa por nome, GPS e painel de paragem com partidas GTFS quando disponíveis.
- Seletor de linha baseado em GTFS; trajeto tracejado **esquemático**, não assente na geometria das ruas.
- Aviso explícito quando não há dados GTFS (não inventa horários).
- Este ZIP é código-fonte completo para GitHub Actions gerar WebApp e APK; não inclui APK pré-compilada.


## Atualização automática de paragens OSM (V1.4)

Os ficheiros de paragens são exportados por `scripts/export_osm_stops.py` e
o GitHub Actions `.github/workflows/update-osm-stops.yml` executa o processo
semanalmente ou manualmente (`Actions > Atualizar paragens OSM > Run workflow`).

São gerados `public/data/osm-stops-leiria.json` e `.geojson`. A app tenta
consultar a API Overpass, depois usa a cache local e, se necessário, a cópia
incluída com a app. A primeira compilação deve ser precedida pela execução
do workflow de paragens para criar a cópia. Sem essa cópia, a app continua a
tentar o Overpass.

A exportação usa uma caixa geográfica da área urbana de Leiria, não todos
os limites do concelho. Os pontos não comprovam linhas ou horários ativos.
A atualização do repositório apenas altera os dados na próxima publicação
da WebApp ou na próxima atualização da APK.

## V1.5 — Catálogo oficial e caminho para horários por paragem

- Separador **Linhas**: páginas das linhas 1 a 9 da Mobilis, com links PDF quando verificados pelo workflow. A consulta das páginas NÃO implica dados de horários importados.
- `scripts/update_mobilis_sources.py`: lê páginas oficiais semanalmente, extrai links PDF identificáveis, mantém o catálogo anterior em falhas de rede; `.github/workflows/update-mobilis-sources.yml` corre às segundas às 05:15 UTC ou manualmente.
- `scripts/build_reviewed_gtfs.py`: converte uma tabela CSV **preenchida, conferida e assinada como revista** num GTFS sem interpolar horas. O modelo de colunas está em `data/reviewed-departures-template.csv`. Coloca a tabela validada em `data/reviewed-departures.csv` e executa `python scripts/build_reviewed_gtfs.py` para obter `public/data/mobilis-reviewed-gtfs.zip`.
- Para importar o GTFS criado, usa o separador Dados da app. A versão 1.5 não contém horários já transcritos, nem ligações confirmadas para todas as paragens.
- O catálogo automático nunca publica GTFS fictício. É necessário validar documentalmente cada horário, dia útil/fim de semana e sentido, com base nos originais Mobilis.
- A rede de referência contém linhas 1 a 9. A alegada linha 10 no exemplo Vidigal–Campo Amarelo continua não confirmada.

**Validação local:** `node --test tests/official.test.mjs`; `python -m py_compile scripts/*.py`. A compilação completa necessita de `npm install` com acesso ao registo npm.


## V1.6 — Traçados reais de relações OpenStreetMap
O workflow `update-osm-network.yml` executa `export_osm_stops.py` e `osm_network.py` todas as segundas às 04:30 UTC. Requer Actions com permissões de escrita e a branch sem proteção contra pushes do bot (ou substituição por PR). Os traçados surgem no filtro «Traçados OSM» depois de o workflow produzir `public/data/osm-network.json`. Não são horários nem posições em tempo real. A app preserva segmentos descontínuos e permite selecionar separadamente as linhas GTFS.


## V1.7 — Atrasos comunicados pelo utilizador
O planeador aceita correções em minutos identificadas pelo `trip_id` GTFS. Sempre que um atraso é alterado num dos autocarros apresentados, o percurso é recalculado integralmente: uma ligação perdida deixa de ser proposta. O atraso é local à sessão e não se propaga a outras viagens da mesma linha. Os horários-base exigem dados GTFS de origem e validade confirmadas; este projeto não inclui horas artificiais.

### Redundância de fontes
1. GTFS atual autorizado do operador/TRENMO (a solicitar).
2. Horários oficiais atuais publicados pela Mobilis, depois de digitalizados e revistos.
3. GTFS histórico de terceiros apenas para comparação, nunca como calendário em vigor.
4. OSM para geometria e localização, não para horários.


## V1.8 — Arranque com amostra publicada (31/10/2026)
- O projeto arranca sem upload: `public/data/mobilis-sample.json` contém **apenas duas viagens matinais** da linha 7, com 17 paragens consecutivas do troço entre R. Capitão Mouzinho de Albuquerque e Escola Básica Touria, em dias úteis; os horários foram transcritos da [tabela pública Moovit](https://moovitapp.com/index/pt/transportes_p%C3%BAblicos-time-7-Lisboa-2460-3784393-309401193-10954025-0), indicada como atualizada em 25/10/2026. 
- O conjunto é **parcial e não é um GTFS oficial**. Não cria horários das restantes linhas, não assume cadências nem viagens fora da tabela, e não valida feriados ou períodos escolares. Cuidado com as regras de reutilização de dados antes de distribuição comercial.
- O mapa OSM mantém-se independente, e a associação aos horários incluídos só ocorre quando há correspondência exata e não ambígua de nome; sem coordenadas da amostra, a posição exata precisa de confirmação.
- Um GTFS completo importado pelo utilizador prevalece sobre a amostra. A alteração não inclui geolocalização em direto.


## V1.8 — Arranque com amostra programada

Incluído `public/data/mobilis-sample.json`, com **apenas amostras verificadas** de algumas circulações das linhas 1, 7 e 8, obtidas das páginas públicas Moovit (31/10/2026). Fonte e atualização assinaladas na app. **Não representa cobertura de todas as linhas, horários ou sentidos.** A linha 1 contém somente quatro paragens por circulação; a linha 8 tem apenas o troço publicado na extração verificada; a linha 7 inclui uma sequência longa mas ainda exige verificação do sentido e dos dias especiais. A lista de fontes das linhas 1–9 está em `public/data/coverage.json`.

O sistema de planeamento só deve apresentar resultados dentro da amostra e nunca garantir a melhor alternativa para a rede completa. Os nomes de paragem não incluem coordenadas GPS nesta amostra: mapa cartográfico obtém-nas do OSM, com associação por nome quando verificável. Dados oficiais GTFS autorizados substituem a amostra quando importados no dispositivo. A reutilização sistemática ou redistribuição de dados de terceiros exige verificação das condições de licença; este conjunto é uma amostra de desenvolvimento, não uma redistribuição integral.

Validação de futuras transcrições: `python scripts/validate_stop_schedule.py data/reviewed-stop-schedule.csv`. Não publicamos partidas inventadas nem extrações automáticas de terceiros sem autorização.

## V1.8.1 — Tempos entre paragens

- As passagens da base parcial são usadas como horários **programados** no planeador; o tempo de viagem de cada troço é a diferença entre horas sucessivas da mesma circulação.
- Mostra duração total, tempo a bordo, espera e número de transbordos. Um atraso indicado para uma viagem recalcula os transbordos, podendo eliminar uma ligação inviável.
- A base integrada continua parcial (linhas 1, 7 e 8) e tem calendários genéricos ainda por confirmar. Não usar para garantir horários de fins de semana/feriados ou para afirmar que uma ligação ausente não existe.
- As posições de paragens sem coordenadas GTFS não são inventadas: a camada OSM continua a fornecê-las separadamente.


## V1.8.2 — consulta pública de paragens (01-11-2026)
- Sequência documentada de **18 paragens** num sentido da linha 3, em `public/data/published-stop-sequences.json`, com ligação à fonte pública Moovit. Sem horários nem coordenadas: não é integrada no motor de cálculo nem apresentada como GTFS.
- Corrigida a data inicial da pesquisa para respeitar o dia local (em vez de UTC).
- Mantida a base parcial de 312 passagens programadas para cálculo apenas dos percursos cobertos.
- A atribuição e os direitos de reutilização da fonte externa devem ser verificados antes de distribuição pública da sequência transcrita.


## V1.8.3 — Novas sequências publicadas

- Linha 4: 32 posições na sequência circular via Andrinos, consultadas no Moovit (consulta em 1-11-2026).
- Linha 5: excerto de 15 posições na sequência circular via Pinheiros; a página anuncia 38 paragens, pelo que não deve ser tratado como completo.
- Linha 3: mantido o excerto anterior (18 posições).
- Esta informação aparece apenas na consulta de linhas; **não** gera viagens, horários nem tempos de paragem falsos.
- Fontes: https://moovitapp.com/index/pt/transportes_p%C3%BAblicos-line-4-Lisboa-2460-3784393-309401190-0 e https://moovitapp.com/index/pt/transportes_p%C3%BAblicos-line-5-Lisboa-2460-3784393-309401191-0 . Verificar condições de reutilização antes de distribuição pública.
- A linha 9 sofreu supressões temporárias em fevereiro de 2026; a situação atual precisa de confirmação.


## RC2: Localização e percurso a pé
Ao primeiro arranque, a app apresenta uma explicação e botão para pedir autorização de GPS. A autorização real é gerida pelo Android/navegador; pode ser recusada e reativada com o botão GPS. É necessário HTTPS na WebApp. A opção «Como chegar a pé» na ficha de qualquer paragem abre o Google Maps em modo pedonal, tendo a posição GPS como origem se tiver sido autorizada; caso contrário o serviço de mapas determina a origem. A rota e a duração não são calculadas internamente pela aplicação e requerem serviço de mapas disponível.
