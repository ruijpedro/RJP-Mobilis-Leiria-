# Auditoria RJP Mobilis — 2026-11-04

## Resultado
**PASS_WITH_GAPS** — integridade estrutural aprovada; cobertura e confirmação operacional incompletas.

Auditoria automática: `node scripts/audit_network.mjs` (executada nas compilações e antes da Release).

| Indicador | Resultado |
| --- | ---: |
| Linhas com serviços digitalizados | 9 de 9 |
| Circulações digitalizadas | 220 |
| Horas aproximadas por interpolação | 2072 |
| Posições de paragem nos percursos publicados | 298 |
| Designações normalizadas distintas no catálogo | 147 |
| Designações do catálogo com horas digitais correspondentes (publicadas ou aproximadas) | 61 |
| Designações do catálogo sem correspondência horária digital | 86 |
| Designações do catálogo que coincidem com referências oficiais transcritas | 14 |
| Designações oficiais únicas transcritas | 40 |

**Atenção:** são designações, não plataformas fisicamente identificadas. Mesmo 61/147 não significa 41,5% de cobertura geográfica certificada, porque os dois sentidos da rua podem usar plataformas diferentes. As 2072 horas aproximadas não são horas oficiais nem localização em tempo real.

## Circulações por linha

| Linha | Total | Dias úteis | Sábado | Domingo |
| --- | ---: | ---: | ---: | ---: |
| 1 | 51 | 31 | 13 | 7 |
| 2 | 36 | 27 | 9 | 0 |
| 3 | 27 | 8 | 11 | 8 |
| 4 | 16 | 10 | 3 | 3 |
| 5 | 19 | 11 | 5 | 3 |
| 6 | 33 | 19 | 8 | 6 |
| 7 | 16 | 10 | 3 | 3 |
| 8 | 10 | 4 | 3 | 3 |
| 9 | 12 | 12 | 0 | 0 |

Um zero significa *sem horários digitalizados* nesse período, não confirmação de inexistência de serviço.

## Regras validadas

1. Identificadores de circulação únicos, linhas 1–9 e fontes oficiais Mobilis nas transcrições.
2. Sequências horárias crescentes dentro de cada circulação, datas e calendários estruturados.
3. As horas oficiais permanecem inalteradas depois da interpolação; não se criam novas viagens.
4. Cada hora aproximada fica entre duas referências conhecidas da mesma viagem, com a marcação `≈`.
5. O planeador considera uma margem adicional de 10 minutos nos transbordos envolvendo horas aproximadas.
6. O workflow de produção compara identificador Android, certificado SHA-256 e `versionCode` com a última APK assinada.

## Lacunas / riscos que impedem afirmar 100% de validação

- Paragens/sentidos sem correspondência segura à plataforma e às horas publicadas.
- Linha 3 e outras variantes com sequências de percurso incompletas.
- Ausência de circulações de domingo digitalizadas para as linhas 2 e 9; confirmar se há serviço no operador.
- Feriados e exceções de calendário não completamente transcritos.
- Os serviços codificados têm datas técnicas de revisão até 2026-12-31; são necessários dados atualizados para 2027.
- As sequências secundárias de percurso são informação de descoberta, a validar contra as alterações Mobilis que entraram em vigor em 2026-09-01.
- O sítio oficial Mobilis apresenta um aviso sobre alteração de local de paragem nas linhas 1 e 2; confirmar a localização real antes de atribuir lados de rua.
- O teste Web/Android não substitui ensaios de campo com horas afixadas em cada paragem.

## Estado de publicação Android

Última Release assinada encontrada nesta auditoria: **v1.10.15**. Não declarar a V1.10.16 publicada sem execução bem-sucedida do workflow de publicação assinada. APK debug tem pacote separado `pt.rjp.mobilisleiria.dev`.

## Próximo critério de aceitação

Completar e verificar para cada paragem física: identificador persistente, coordenadas, linha, sentido, ordem no percurso, horários por período, fonte e classificação `oficial` ou `aproximada`. Depois testar viagens com origem/destino arbitrárias e transbordos reais, incluindo dias úteis, sábado, domingo e feriados.
