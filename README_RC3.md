# RJP Mobilis Leiria V1.9 RC3 — Registo comunitário

O botão **Vi o autocarro passar** está integrado nas fichas das paragens, mas desativado até configurar Firebase e publicar a função. As coordenadas GPS são enviadas **apenas à função** para verificar a distância a uma paragem verificada; **não são guardadas nas observações**. As coordenadas são declaradas pelo cliente, pelo que podem ser falsificadas.

## Ativação
1. Criar projeto Firebase e registar aplicação Web; copiar `.env.example` para `.env` e preencher os valores `VITE_...`. Não colocar segredos no cliente.
2. Ativar Authentication > Sign-in method > Anonymous; Firestore; e App Check (reCAPTCHA Enterprise para WebView/Android requer configuração própria e testes).
3. Configurar conta/plano Firebase com suporte a Cloud Functions e instalar Firebase CLI. `cd functions && npm install && cd ..`; depois `firebase use --add` e `firebase deploy --only firestore:rules,functions:crowd`.
4. Importar, via Admin SDK, os documentos `verifiedStops/{stopId}` com `lat`, `lon` das paragens OSM conferidas. **A função rejeita paragens sem registo verificado.** 
5. Confirmar que o App Check emite tokens válidos antes de ativar `enforceAppCheck` na função; testes Android requerem configuração apropriada do provedor App Check.
6. `npm install && npm test && npm run build`; executar o workflow Android.

## Segurança e limites
- Escrita direta no Firestore está proibida; só a callable Function autenticada grava dados.
- Registos limitados a 1 a cada 5 minutos e 12 por dia por UID; autenticação anónima **não garante pessoa única**. Considerar quotas globais/anti-abuso adicionais.
- Localização não fica guardada; `nearMeters` e UID anónimo **continuam a ser dados potencialmente pessoais**. Preparar informação de privacidade e retenção/eliminação por período antes de produção.
- `summarizeObservations` exige 3 dias diferentes e 2 UID para um agrupamento de ±3 min. **Ainda não há um processo programado a publicar os agregados** em `observedSchedules`.
- Os registos históricos nunca devem ser apresentados como posição em direto nem alterar os horários oficiais sem indicação clara.
