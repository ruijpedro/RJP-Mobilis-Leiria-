# RJP Mobilis Leiria — RC3.4

## Alterações
- Firebase App Check Web integrado com ReCaptchaEnterpriseProvider e site key pública do projeto.
- O envio de observações exige autenticação anónima e token App Check válido.
- Botão de registo comunitário desativado na APK Capacitor até existir integração nativa Play Integrity; mapas, horários e planeador não são bloqueados.
- Mantidas regras Firestore de negação de escrita direta. Observações são recebidas exclusivamente pela Cloud Function.

## Antes de testar de ponta a ponta
1. Publicar a WebApp em domínio autorizado na chave reCAPTCHA (Firebase Hosting ou domínio personalizado).
2. Ativar Authentication anónimo, Firestore, e registar WebApp no App Check (já configurados na consola segundo capturas partilhadas).
3. Publicar a função `submitObservedPassage` em `europe-west1` com Firebase CLI e conta com permissões de deploy: `cd functions && npm install`; na raiz `npx firebase-tools deploy --only functions,firestore:rules --project rjp-mobilis-leiria`.
4. Alimentar `verifiedStops` com documentos com ID igual a `stopId`, e campos `lat`, `lon` validados contra dados oficiais ou OSM. Sem isto a função devolve `failed-precondition`.
5. Testar WebApp real com HTTPS, GPS consentido, utilizador anónimo, token App Check e paragem verificada a menos de 75m. Não ativar ainda Enforcement no Firestore/Auth.
6. Agregação dos horários comunitários ainda NÃO implementada nem publicada em `observedSchedules`.

## Limitações
- Coordenadas do passageiro são enviadas à função para validar a distância; não são guardadas na coleção de observações, mas transitam pelo servidor. A localização GPS pode ser falsificada.
- O App Check da Web não equivale ao Play Integrity nativo Android.
- Os testes isolados não comprovam deploy real Firebase nem build Android; testar no GitHub Actions.
- Se o website for alojado noutro domínio, adicioná-lo à lista autorizada da chave reCAPTCHA Enterprise.
