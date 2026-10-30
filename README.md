# RJP Mobilis Leiria V1.1

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

## V1.2 — Mapa interativo

O ecrã inicial é agora o **Mapa** (OpenStreetMap + Leaflet), com paragens georreferenciadas provenientes do GTFS carregado pelo utilizador. Ao selecionar uma paragem apresenta as linhas e respetivos destinos (`trip_headsign`), bem como as próximas partidas programadas de acordo com a data e hora escolhidas em Percursos. A escolha da linha filtra as paragens e apresenta o traçado do `shapes.txt` quando disponível. Sem `shapes.txt`, a aplicação não desenha um traçado, evitando inventar ruas ou sequências. Os botões de cada paragem permitem usá-la como origem/destino do planeador.

**Importante:** Não contém uma base real de paragens e horários da Mobilis pré-carregada; requer importar GTFS válido de fonte autorizada. Quando não há dados, mostra apenas o mapa de Leiria. Não existe autocarro em tempo real sem API validada. Para o mapa-base online é necessária Internet; os horários GTFS guardam-se localmente.

## V1.3 — Atualizar GTFS pela Internet

Na área Dados é possível configurar o URL HTTPS de um ZIP GTFS fornecido por uma fonte autorizada. O botão **Atualizar horários pela Internet** descarrega, valida e importa os horários; só substitui a base local após uma importação bem-sucedida. O URL fica guardado no dispositivo. Limite de 30 MB. Falhas de rede, formato ou CORS mantêm os dados anteriores. O sistema não consulta automaticamente PDFs nem deduz horários a partir de mapas.

**Não foi identificada uma URL GTFS oficial pública e validada para a Mobilis.** A fonte não é predefinida. Para utilização real em Leiria, confirmar direitos de utilização, cobertura e vigência do ficheiro. Não apresentar localização de veículos em tempo real sem integração autorizada.

## V1.4 — Consulta oficial verificada

Novo separador **Oficiais** com ligação às páginas da Mobilis para as linhas 1–9 e transcrição da tabela da paragem **Vidigal** na linha 7, conferida no PDF oficial de 1 de setembro de 2026 (10 passagens em dias úteis, 3 em sábados/domingos/feriados). A seleção de data distingue fins de semana; **feriados que calhem em dias úteis devem ser confirmados no PDF**, porque esta versão ainda não tem calendário de feriados.

PDF fonte: https://mobilis.pt/media/2026/08/00-1857-356-03-CM-Leiria-PDF-LINHA-7.pdf

As horas não representam previsões em tempo real. Os restantes horários e as coordenadas de paragens da rede continuam a depender de dados GTFS válidos. Nenhum transbordo da linha 7 para uma suposta linha 10 foi confirmado.

### Testes

`node --test tests/official.test.mjs` valida a consulta oficial. Os restantes testes dependem de `npm install` (JSZip e restantes dependências). Se a rede não permitir instalar dependências, não afirmar que a aplicação foi compilada.

## V1.5 — GPS / paragem mais próxima

No separador Mapa, toque em **Encontrar a paragem mais próxima** e autorize a localização. A app determina as paragens georreferenciadas mais próximas com distância em linha reta, destaca a mais próxima, disponibiliza acesso às linhas e partidas programadas existentes e abre o percurso pedonal no Google Maps. Quando já existe autorização de localização, a app consulta-a ao carregar a base de paragens. O GPS requer HTTPS ou localhost, permissões do sistema e uma base GTFS com coordenadas. A distância de caminhada real pode ser superior. Sem base de paragens não é possível identificar paragens próximas.

## V1.6 — Planeador origem → destino e avisos de saída
- Após escolher paragens concretas, mostra a(s) linha(s), a hora programada de partida e de chegada, a duração completa incluindo esperas e os transbordos.
- Um botão no último troço ativa `watchPosition` para avisar quando o GPS estiver a cerca de 350 m da paragem de saída. Vibrará quando o dispositivo suportar.
- O acompanhamento exige a app aberta, GPS ativo e permissão de localização. A distância é em linha reta e não representa uma previsão da posição do autocarro.
- Os resultados dependem de um GTFS válido importado; as sugestões de nomes (ex.: teatro) têm de ser associadas à paragem. Não há dados em tempo real nem previsão de trânsito.


## Correção GitHub Actions (2026-10-30)
A ação `android-actions/setup-android@v3` foi removida do workflow porque tentava instalar o pacote SDK legado `tools`, que já não existe. O runner Ubuntu inclui o Android SDK; instalamos explicitamente `platform-tools`, `platforms;android-35` e `build-tools;35.0.0`. Esta correção não altera a app nem valida, por si, a compilação Android.
