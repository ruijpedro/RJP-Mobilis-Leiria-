# RJP Mobilis Leiria — Atualizações OTA (a partir da APK v1.10.17)

## O que muda
Atualização de conteúdos Web da app (React, planeador, dados incluídos, estilos) sem desinstalar a APK. O sistema segue o padrão piloto da RJP Train Live, com `@capgo/capacitor-updater` para Capacitor 7.

O ZIP OTA é descarregado online a partir de uma **GitHub Release pública**. A app verifica o manifesto em `https://raw.githubusercontent.com/ruijpedro/RJP-Mobilis-Leiria-/main/ota/manifest.json`, compara versões, verifica o SHA-256 ao descarregar e prepara a instalação para a próxima abertura. O plugin permite regressar à versão anterior se a atualização não iniciar corretamente.

Os favoritos, GTFS importados e outras preferências em `localStorage` e `IndexedDB` não são deliberadamente apagados/substituídos pelo OTA. A continuidade deve ainda ser ensaiada numa instalação real, especialmente com dados importados.

## Passo 1 — Instalar a APK base assinada v1.10.17
No GitHub > Actions > **Publicar RJP Mobilis (WebApp + APK assinada)** > Run workflow, indicar `v1.10.17`.
O workflow compara `applicationId`, certificado SHA-256 e `versionCode` com a APK assinada anterior. **Não utilizar o APK debug para atualizar a versão instalada**: usa o pacote `pt.rjp.mobilisleiria.dev` e uma assinatura de teste.

Até esta APK base ser instalada, as antigas versões não possuem o componente nativo OTA e não poderão receber pacotes Web remotos.

## Passo 2 — Preparar uma atualização Web posterior
Alterar apenas os ficheiros Web (incluindo `src/` e `public/data/`) e subir `package.json` para a versão seguinte, por exemplo `1.10.18`. **Não alterar** dependências, `capacitor.config.json`, `android/`, `ios/`, permissões ou código nativo; estes elementos exigem nova APK assinada.

## Passo 3 — Publicar o pacote OTA
GitHub > Actions > **Publicar RJP Mobilis OTA (Web sem reinstalar APK)** > Run workflow.
Indicar a versão (por exemplo, `1.10.18`) e escrever `PUBLICAR`.

O workflow:
1. confirma a existência da APK base `v1.10.17` e a compatibilidade do código com essa versão;
2. executa os testes, auditorias e compila o `dist`;
3. cria o ZIP Web com `index.html` na raiz e o SHA-256;
4. publica a GitHub Release `ota-v1.10.18`;
5. confirma o ZIP remoto e só então atualiza `ota/manifest.json` na `main`.

## Passo 4 — Utilização no Android
Ao abrir a app, é consultado o manifesto online e o novo pacote pode ficar preparado para a próxima abertura. O utilizador também tem **Verificar OTA**.

Se não houver internet ou a versão não for superior, mantém-se o pacote atual. A WebApp alojada precisa de publicação própria; o plugin OTA só atua dentro da APK nativa.

## Testes essenciais antes de distribuir
Ensaiar num dispositivo: atualização de v1.10.17 para OTA 1.10.18; segundo arranque; atualização sem internet; pacote corrompido; recuperação/rollback; favoritos e GTFS persistentes; itinerários e transbordos; preservação da assinatura e instalação por cima da APK anterior.

**Limitação:** um SHA-256 no manifesto verifica a integridade contra o manifesto recebido, mas não autentica independentemente um manifesto comprometido. Proteger o repositório, as permissões de Actions e a conta GitHub é obrigatório para produção. Não guardar segredos em `src/` ou no manifesto.

**Estado inicial:** `ota/manifest.json` aponta para v1.10.17 sem URL — não existe atualização OTA publicada até o workflow correspondente ser executado.
