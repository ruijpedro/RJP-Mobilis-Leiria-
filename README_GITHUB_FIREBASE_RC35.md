# RJP Mobilis Leiria — RC3.5: publicação Firebase via GitHub Actions

Esta versão **não publica automaticamente** nada: acrescenta um workflow manual `.github/workflows/firebase-deploy.yml` que usa OpenID Connect/Workload Identity Federation (WIF), sem passwords, tokens Firebase ou ficheiros JSON privados no repositório.

## Preparação (uma única vez, no navegador)

1. No Google Cloud do projeto `rjp-mobilis-leiria`, ativa as APIs e serviços necessários às Cloud Functions/Firebase (Cloud Functions, Cloud Build, Artifact Registry, Cloud Run e IAM Credentials, se pedidos).
2. Cria uma **service account dedicada** à publicação, com permissões mínimas para publicar Functions e regras. A publicação de Functions pode exigir permissões adicionais para Cloud Run, Cloud Build, Artifact Registry e `iam.serviceAccounts.actAs`; atribui-as de acordo com os erros concretos de IAM. Não uses uma conta de serviço com acesso indiscriminado.
3. Em IAM > Workload Identity Federation, cria um pool e um provider OIDC para `https://token.actions.githubusercontent.com`. Restringe os tokens ao repositório `ruijpedro/RJP-Mobilis-Leiria-` e, preferencialmente, ao ambiente protegido `firebase-production`. Concede à identidade do provider a autorização **Workload Identity User** para assumir a conta de serviço criada.
4. No GitHub do repositório, cria os **Actions secrets**:
   - `GCP_WIF_PROVIDER`: nome completo do provider, formato `projects/NUMERO/locations/global/workloadIdentityPools/POOL/providers/PROVIDER`.
   - `GCP_WIF_SERVICE_ACCOUNT`: email da conta de serviço dedicada.
5. Em GitHub > Settings > Environments, cria o ambiente `firebase-production` e configura aprovações de publicação, se desejado.

**Não coloques no repositório** ficheiros JSON privados de contas de serviço, refresh tokens, segredos da CLI ou credenciais de administrador.

## Publicação

GitHub > Actions > **Publicar Firebase (sem instalar no PC)** > Run workflow. Escolhe primeiro `functions` ou `firestore:rules`, conforme o que pretendes testar. O alvo `functions,firestore:rules` publica ambos.

O workflow instala Node.js 22 e as dependências das Functions no servidor, verifica a sintaxe e publica com `firebase-tools`. O Firestore usa regras estritas já preparadas para observações privadas e horários comunitários de leitura pública.

## Limites que permanecem

- A função `submitObservedPassage` requer uma paragem previamente validada em `verifiedStops`. Esta RC **não carrega essa coleção**; sem ela o botão devolve erro, por segurança.
- A agregação de observações em `observedSchedules` **não está implementada** e não pode ser tratada como horário confirmado.
- App Check Web está preparado; a APK Capacitor mantém registos comunitários desativados até integração nativa Play Integrity.
- Não atives o enforcement global do App Check antes de testar pedidos reais.
- O projeto está no plano Blaze; publicação e execuções podem ter custos. Configura alertas de orçamento. Alertas não suspendem automaticamente despesas.
- O workflow de APK é independente em `.github/workflows/build.yml`.
