# RJP Mobilis Leiria V3.2

## Alteração real desta versão

- Diagnóstico por linha: número de viagens estruturadas com pelo menos duas paragens distintas e horas válidas.
- Distingue linhas identificadas de carreiras que têm viagens calculáveis.
- Testes automatizados para ausência de dados, horários isolados e viagens completas.
- Não são inventados horários. A consulta automática de fontes não equivale a ter os horários convertidos.

## Situação dos dados

Ainda não foi identificado GTFS Mobilis público e completo. A app continua a mostrar fontes oficiais e paragens OSM, mas não calcula viagens de toda a rede sem feed validado. As imagens/PDFs oficiais exigem transcrição e verificação da sequência de paragens.

## Executar

`npm install` e `npm test`; `npm run build`. Para Android, consultar `.github/workflows/build.yml`.

# RJP Mobilis Leiria V3.1

**Evolução verificada:** data de pesquisa conforme fuso local do telemóvel (em vez de UTC); diagnóstico específico para identificar se existem viagens com pelo menos duas paragens utilizáveis. Incluídos testes automatizados.

**Cobertura real:** não foi encontrado e validado um GTFS oficial público completo Mobilis em 30-10-2026. A V3.1 não afirma conter horários completos e ainda não resolve todos os percursos. A app conserva o comportamento anterior (mapa OSM, GPS, fontes, planeador GTFS, favoritos).

Executar: `npm ci` (quando existir lockfile) ou `npm install`; `npm test`; `npm run build`. A APK exige o workflow Android e dependências disponíveis.

# RJP Mobilis Leiria V2.7 — Fontes visuais oficiais

Evolução da V2.6: auditoria das páginas das linhas 1 a 9, incluindo imagens PNG/JPEG/WebP de horários (não apenas PDF/SVG); validação das assinaturas dos ficheiros, indicação de formato e acesso direto aos documentos na secção Oficiais. A atualização do índice ocorre pelo GitHub Actions duas vezes por dia.

**Limite de cobertura:** imagens e PDFs são referências oficiais, mas não são uma tabela de partidas processável. A V2.7 não calcula, por si só, todos os trajetos por paragem até existir GTFS verificado ou transcrição validada integral. Não inventa viagens, tempos nem linhas.

**Execução:** `npm install`, `npm run dev`, `npm test`, `npm run build`. Para atualizar o índice: `python scripts/update_sources.py`; a Internet é necessária nesse passo. O fluxo Android está em `.github/workflows/build.yml`.

# RJP Mobilis Leiria V2.6 — Catálogo oficial com ligações verificadas

Preserva todas as funcionalidades de mapa, GPS, paragens, roteamento GTFS e ícones da V2.5.

## O que mudou

- Na secção **Oficiais**, cada linha apresenta ligações diretas a PDFs ou SVG de horários **quando os anexos são acessíveis e verificados pelo workflow**.
- O workflow verifica a assinatura dos anexos (não basta a página devolver HTTP 200).
- Falhas transitórias não eliminam a referência a um GTFS previamente validado.
- Identificação da versão V2.6 na interface.

## Como atualizar

O workflow `.github/workflows/update-sources.yml` é executado duas vezes ao dia e publica `public/data/mobilis-sources.json` no repositório. Para atualizações na APK **após a instalação**, configurar `VITE_MOBILIS_CATALOG_URL` no build para um URL HTTPS público que sirva esse JSON. Sem isso, o ficheiro incluído na APK não muda automaticamente.

A variável opcional `MOBILIS_VERIFIED_GTFS_URL` só deve apontar para uma fonte GTFS de Leiria legítima. Se não existir, as ligações aos PDFs continuam a ser mostradas, mas **não são criadas viagens automaticamente**.

**Limitação:** ainda não está disponível uma base estruturada e validada de todos os horários por paragem. O cálculo de viagens depende dessa base.

## Testes

`python -m unittest discover -s scripts -p 'test_*.py'`

`npm test`

`npm run build`

## V2.8 — Fila de validação dos horários

O workflow gera `public/data/mobilis-review-queue.json`, que reúne **candidatos** extraídos de PDFs oficiais acessíveis (URL, SHA-256 e horas reconhecidas). Estes dados **não** são usados para calcular percursos até serem associados manualmente a paragem, sentido, coluna/viagem e calendário. Documentos PNG/JPG continuam apenas listados como fontes visuais. A app deixa de apresentar os horários históricos da linha 7 como se estivessem confirmados.

**Limite atual:** esta versão não contém GTFS Mobilis completo, não apresenta horas reais por todas as paragens e não garante a compilação Android. O workflow necessita de permissões de escrita para atualizar ficheiros.


## V2.9 — Conversão segura para GTFS

Adicionado `scripts/build_reviewed_gtfs.py`, que transforma viagens **revistas manualmente** em GTFS para o planeador, com validação de paragens, sequência, horários, datas e rastreio da fonte oficial. Aceita horas GTFS depois da meia-noite (24:xx).

Amostra em `dados/reviewed-trips.schema-example.json`: **é fictícia e intencionalmente não aprovada**, logo não é integrada na aplicação. Para gerar GTFS a partir de viagens efetivamente verificadas: `python scripts/build_reviewed_gtfs.py DADOS_APROVADOS.json mobilis-validado.zip`.

Os horários reais de toda a rede ainda não foram validados nem pré-carregados nesta versão. A atualização automática mantém-se preparada, mas depende de publicar um feed GTFS revisto.

Teste: `python -m unittest discover -s tests -p 'test_reviewed_gtfs.py'`.


## V3.0 — Primeira referência externa identificada por paragem

Inclui duas passagens publicadas para **Escola Básica do Vidigal, Linha 7** (dias úteis: 07:17 e 08:07), provenientes da página Moovit referente ao percurso via Pousos. São **dados de uma fonte independente**, não horários oficialmente homologados pela Mobilis. A interface mostra a fonte e o aviso; estes valores **não alimentam o cálculo de viagens** porque não temos a viagem completa com paragens e coordenadas confirmadas.

A aplicação continua a necessitar de horários oficiais completos e georreferenciados para planear toda a rede. A verificação de fontes continua no workflow.

Verificar: `node --test tests/referenceTimes.test.mjs`.
