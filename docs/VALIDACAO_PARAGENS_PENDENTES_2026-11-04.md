# Validação de paragens pendentes — 4 de novembro de 2026

## Como foi feita

Cruzámos o catálogo de percursos das nove linhas Mobilis com os horários oficiais transcritos e as passagens calculadas, e depois com **293 elementos OSM locais**. O programa `node scripts/audit_remaining_stops.mjs --write` produz uma ficha por cada uma das 147 designações de paragem no ficheiro `docs/paragens-pendentes-auditoria.json` (artefacto da execução GitHub Actions).

## Estado verificado

| Situação | Designações |
|---|---:|
| Com hora digital (oficial ou estimada) | 61 |
| Sem hora digital, com um candidato OSM com nome igual | 38 |
| Sem hora digital, com vários candidatos OSM com nome igual | 20 |
| Sem hora digital e sem candidato OSM com nome igual | 28 |
| **Total** | **147** |

**Nas 86 designações sem hora digital, foram encontrados candidatos OSM para 58 (38 únicos e 20 múltiplos).** Isto confirma apenas uma *correspondência entre nomes*, não o sentido nem a posição de embarque em cada lado da via. OSM não prova que a paragem está atualmente servida pela linha no horário divulgado. As 28 restantes exigem outras fontes geográficas ou normalização manual de nomes.

## Próxima validação por etapas

1. **38 correspondências OSM únicas:** comparar localização e fotos/placas oficiais, confirmar linha e sentido; só depois associar a um identificador de plataforma.
2. **20 nomes com plataformas múltiplas:** identificar ambos os lados da rua, direção de cada linha e paragem correspondente no GTFS. **Nunca unir automaticamente** estas plataformas.
3. **28 nomes sem correspondência exata:** usar as sugestões de nomes semelhantes do relatório para revisão manual, consultar sinalização e coordenadas do operador, evitando semelhanças superficiais.
4. **Horários:** importar ou transcrever a passagem na paragem, quando publicada; em alternativa, interpolar entre **duas referências verificadas da mesma circulação** com a marca `≈`. Não criar horários simplesmente por existir um ponto OSM.

## Limitações

As listagens externas de percursos podem não refletir todas as variantes e alterações de setembro de 2026. A linha 3 tem apenas um excerto da sequência de percurso; a linha 6 tem, neste catálogo, uma das direções. A eventual existência de uma paragem não implica horário disponível em todos os dias. A cobertura de 61/147 diz respeito a nomes, não a 147 plataformas certificadas.

Não foi publicada uma nova APK assinada como parte desta auditoria.
