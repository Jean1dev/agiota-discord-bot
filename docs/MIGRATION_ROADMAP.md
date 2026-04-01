# Migration Roadmap — JavaScript → TypeScript

> Progresso: **Fases 1–6 concluídas** | Restam: Fases 7–12
> Cobertura de testes atual: **97.91%** nos arquivos TS
> Arquivos JS restantes: **113** | Arquivos TS: **22**

---

## Legenda de status

| Símbolo | Significado |
|---|---|
| ✅ | Concluído |
| 🔄 | Em andamento |
| ⬜ | Pendente |

---

## ✅ Fase 1 — Foundation (TypeScript + Infraestrutura)

**Objetivo:** Preparar o terreno para a migração sem quebrar nada.

- [x] `tsconfig.json` com `allowJs: true`, `strict: true`, paths aliases (`@domain/*`, `@shared/*`, etc.)
- [x] `tsconfig.test.json` para ambiente Jest
- [x] `jest.config.js` com ts-jest
- [x] `src/shared/logger/Logger.ts` — pino com child loggers
- [x] `src/domain/shared/Result.ts` — monad Result<T,E>
- [x] `src/config/env.ts` — validação de variáveis de ambiente com Zod (fail-fast)
- [x] `src/infrastructure/database/MongoConnection.ts` — singleton tipado
- [x] `.env.example` com `ADMIN_DISCORD_USER_IDS`

---

## ✅ Fase 2 — Debt Domain (Domínio de Dívidas)

**Objetivo:** Migrar o domínio mais crítico do bot com clean architecture.

- [x] `src/domain/debt/Debt.ts` — value object imutável (`create` + `reconstitute`)
- [x] `src/domain/debt/DebtUser.ts` — aggregate com mutations imutáveis
- [x] `src/domain/debt/IDebtRepository.ts` — interface do repositório
- [x] `src/infrastructure/database/MongoDebtRepository.ts` — mapeamento legacy schema ↔ domain
- [x] `src/application/debt/AddDebtUseCase.ts`
- [x] `src/application/debt/PayDebtUseCase.ts`
- [x] Testes: `AddDebtUseCase`, `PayDebtUseCase`, `DebtUser`

---

## ✅ Fase 3 — Guards e Segurança

**Objetivo:** Corrigir autorização baseada em username (mutável) → User ID (imutável).

- [x] `src/discord/guards/AuthorizationService.ts` — lê `ADMIN_DISCORD_USER_IDS` do env
- [x] `src/discord/guards/AdminGuard.ts` — decorator `protect()` + `requireAdminById()` standalone
- [x] `src/discord/guards/RateLimitGuard.ts` — fixed-window por userId
- [x] `src/handlers/guard-handler.js` substituído — todos os 13 handlers corrigidos de uma vez
- [x] Testes: `AdminGuard`, `RateLimitGuard`, `AuthorizationService`

---

## ✅ Fase 4 — Remaining Domains (Comandos e Serviços Core)

**Objetivo:** Infraestrutura de comandos tipada + corrigir bugs críticos.

- [x] `src/discord/commands/BaseCommand.ts` — abstract genérico com Zod + rate limit
- [x] `src/services/ai/ChatSessionService.ts` — histórico limitado (TTL + maxMessages), fix memory leak
- [x] `src/discord/commands/ai/ChatGptCommand.ts` — usa ChatSessionService
- [x] Comandos finance, b3, admin, subscriptions — todos wrapados com AdminGuard
- [x] `src/services/GastosCartaoService.js` — removido setTimeout fire-and-forget (race condition)
- [x] Testes: `ChatSessionService`, `BaseCommand`

---

## ✅ Fase 5 — Scheduler (Jobs Agendados)

**Objetivo:** Substituir engine cron customizada (~400 linhas) por npm `node-cron`.

- [x] Instalado `node-cron` + `@types/node-cron`
- [x] `src/scheduler/IJob.ts` — interface comum
- [x] `src/scheduler/JobScheduler.ts` — wrapper tipado com logging estruturado
- [x] `src/scheduler/jobs/HourlyJob.ts` — `0 * * * *`
- [x] `src/scheduler/jobs/MidnightJob.ts` — `10 23 * * *`
- [x] `src/scheduler/jobs/WeekendReportJob.ts` — `15 11 * * 1`
- [x] `src/scheduler/jobs/DailyBudgetJob.ts` — `5 22 * * *`
- [x] `src/scheduler/jobs/QuizJob.ts` — `2 9-19/3 * * 1-3`
- [x] `src/scheduler/jobs/YoutubeRssJob.ts` — `16 8 * * 1-6`
- [x] Removido `src/schedules/` (15 arquivos)

---

## ✅ Fase 6 — Cleanup e Cobertura de Testes

**Objetivo:** Remover código morto, atingir ≥70% de cobertura nos arquivos TS.

- [x] Deletado `src/schedules/` (engine cron customizada)
- [x] Testes para `BaseCommand` — rate limit, validação, erro no handle, adapters legacy
- [x] Testes para `requireAdminById` — ambos overloads (com e sem args)
- [x] Cobertura: 83.85% → **97.91%** statements
- [x] `coverage/` e `dist/` adicionados ao `.gitignore`
- [x] CI: fix `jest.config.ts` → `.js` (Node 21 compatibility)
- [x] CI: fix TypeScript 6 → 5.8 (ts-jest peer dep)
- [x] CI: fix `ffmpeg-static` download no install (`--ignore-scripts`)

---

## ✅ Fase 7 — Repositório e Utilitários

**Objetivo:** Migrar camada de acesso a dados e helpers sem dependência do context.

**Arquivos alvo:**
- [x] `src/repository/mongodb.js` → `src/infrastructure/database/MongoRepository.ts`
- [x] `src/repository/operations.js` → shim (delega para MongoRepository.ts)
- [x] `src/discord-constants.js` → `src/discord/DiscordConstants.ts`
- [x] `src/utils/utils.js` → `src/shared/utils/utils.ts`
- [x] `src/utils/feriados-br.js` → `src/shared/utils/feriados-br.ts`
- [x] `src/utils/discord-nicks-default.js` → `src/shared/utils/discord-nicks-default.ts`
- [x] `src/app-events.js` → `src/shared/events/AppEvents.ts` (typed EventEmitter; listeners AMQP permanecem em JS)
- [x] `src/config.js` → shim mapeando `src/config/env.ts` para nomes legados

**Critério de conclusão:** Nenhum arquivo TS importando `.js` para funções utilitárias.

---

## ⬜ Fase 8 — Serviços Independentes (sem context)

**Objetivo:** Migrar services que não dependem do God object `context.js`.

**Arquivos alvo (sem dependência de context):**
- [ ] `src/services/EmailService.js` → `src/services/email/EmailService.ts`
- [ ] `src/services/GerarPDF.js` → `src/services/pdf/PdfService.ts`
- [ ] `src/services/UploadService.js` → `src/services/upload/UploadService.ts`
- [ ] `src/services/cloud-convert.js` → `src/services/upload/CloudConvertService.ts`
- [ ] `src/services/githubOperations.js` → `src/services/github/GithubService.ts`
- [ ] `src/services/KeycloakService.js` → `src/services/auth/KeycloakService.ts`
- [ ] `src/services/SubscriptionValidator.js` → `src/services/subscription/SubscriptionValidator.ts`
- [ ] `src/services/youtubeRssService.js` → `src/services/youtube/YoutubeRssService.ts`
- [ ] `src/services/MeConecteiService.js` → `src/services/meconectei/MeConecteiService.ts`
- [ ] `src/services/TransactionCategorizationService.js` → finance domain
- [ ] `src/services/OrganizzeService.js` → finance domain

**Critério de conclusão:** Services deste grupo totalmente tipados e testados.

---

## ⬜ Fase 9 — Telegram e WhatsApp

**Objetivo:** Migrar integrações de mensageria isoladas.

**Arquivos alvo:**
- [ ] `src/telegram/config/telegram-config.js` → `src/telegram/TelegramConfig.ts`
- [ ] `src/telegram/utils/telegram-utils.js` → `src/telegram/TelegramUtils.ts`
- [ ] `src/telegram/handlers/index.js` → `src/telegram/TelegramRouter.ts`
- [ ] `src/telegram/handlers/daily-budget-handler.js` → `src/telegram/handlers/DailyBudgetHandler.ts`
- [ ] `src/telegram/handlers/public-handler.js` → `src/telegram/handlers/PublicHandler.ts`
- [ ] `src/telegram/index.js` → `src/telegram/index.ts`
- [ ] `src/services/WhatsAppService.js` → `src/services/whatsapp/WhatsAppService.ts`
- [ ] `src/services/whatsapp/mongoAuthStore.js` → typed
- [ ] `src/services/whatsapp/planFlowHandler.js` → typed
- [ ] `src/services/whatsapp/planSessionStore.js` → typed
- [ ] `src/handlers/whatsapp/*.js` → `src/discord/commands/whatsapp/`

**Critério de conclusão:** Integrações Telegram e WhatsApp totalmente tipadas.

---

## ⬜ Fase 10 — Serviços com Dependência de Context

**Objetivo:** Migrar services que usam o God object, preparando para sua remoção.

> ⚠️ Esta fase exige criar interfaces explícitas para o que cada service precisa do context,
> em vez de passar o objeto inteiro. Padrão: injeção de dependência via construtor.

**Arquivos alvo:**
- [ ] `src/services/RankingService.js` → `src/services/ranking/RankingService.ts`
- [ ] `src/services/broadcast-discord.js` → `src/services/discord/BroadcastService.ts`
- [ ] `src/services/analiseDadosUsuarios.js` → `src/services/analytics/UserAnalyticsService.ts`
- [ ] `src/services/quiz.js` → `src/services/quiz/QuizService.ts`
- [ ] `src/services/myDailyBudget.js` → `src/services/finance/DailyBudgetService.ts`
- [ ] `src/services/FinanceServices.js` → `src/services/finance/FinanceService.ts`
- [ ] `src/services/GastosCartaoService.js` → `src/services/finance/GastosCartaoService.ts`
- [ ] `src/services/CaixinhaService.js` → `src/services/finance/CaixinhaService.ts`
- [ ] `src/services/SubscriptionService.js` → `src/services/subscription/SubscriptionService.ts`
- [ ] `src/services/autoArbitrageService.js` → `src/services/b3/AutoArbitrageService.ts`
- [ ] `src/services/cryptoArbitrageService.js` → `src/services/b3/CryptoArbitrageService.ts`
- [ ] `src/services/MusicManagerService.js` → `src/services/music/MusicManagerService.ts`
- [ ] `src/services/ConversationHistoryGpt.js` → substituído por `ChatSessionService.ts` (já feito)

**Critério de conclusão:** Todos os services tipados com dependências explícitas (sem `context()` direto).

---

## ⬜ Fase 11 — Handlers e Comandos Discord

**Objetivo:** Migrar todos os handlers para o padrão `BaseCommand<TSchema>`.

**Grupos por domínio:**

**Finance (agiotagem):**
- [ ] `src/handlers/agiotagem/add-daily-budget.js`
- [ ] `src/handlers/agiotagem/adicionar-divida.js` (já existe use case TS)
- [ ] `src/handlers/agiotagem/cobrar-dividas.js`
- [ ] `src/handlers/agiotagem/pagar-divida.js` (já existe use case TS)
- [ ] `src/handlers/agiotagem/pesquisar-gastos-do-dia.js`
- [ ] `src/handlers/agiotagem/relatorio-daily-budget.js`
- [ ] `src/handlers/agiotagem/ultimo-emprestimo-info.js`
- [ ] `src/handlers/agiotagem/update-gastos-cartao.js`

**B3 / Finanças:**
- [ ] `src/handlers/b3/arbitragem.js`
- [ ] `src/handlers/b3/atualizar-cotacao-carteira.js`
- [ ] `src/handlers/b3/change-auto-arbitragem.js`
- [ ] `src/handlers/b3/crossing-counts.js`

**Admin:**
- [ ] `src/handlers/admin/db-clean.js`
- [ ] `src/handlers/admin/meconectei.js`
- [ ] `src/handlers/restart.js`

**Utilitários e outros:**
- [ ] `src/handlers/help/help.js`
- [ ] `src/handlers/imgur/index.js`
- [ ] `src/handlers/web3/airdrop.js`
- [ ] `src/handlers/youtube/*.js`
- [ ] `src/handlers/dm/index.js`

**IA:**
- [ ] `src/handlers/ia/chat-gpt.js` (lógica migrada; conectar ao `ChatGptCommand.ts`)
- [ ] `src/handlers/ia/turn-ia-mode.js`
- [ ] `src/ia/index.js`, `src/ia/open-ai-api.js`, `src/ia/watson-utils.js`

**Música:**
- [ ] `src/handlers/music/*.js`
- [ ] `src/audio/*.js`

**Jogo do bicho:**
- [ ] `src/handlers/jogo-bixo/*.js`

**Critério de conclusão:** Todos os handlers migrados para `BaseCommand`; `src/handlers/` vazio.

---

## ⬜ Fase 12 — Remoção do God Object (context.js)

**Objetivo:** Eliminar `src/context.js` e habilitar `allowJs: false`.

> ⚠️ Pré-requisito: Todas as fases anteriores concluídas.

- [ ] Mapear todos os campos de `Context` e criar interfaces explícitas por domínio
- [ ] Substituir `context().client` → injeção do `Client` do Discord via construtor/factory
- [ ] Substituir `context().dividas` → `IDebtRepository` (já existe)
- [ ] Substituir `context().totalGastoCartao` → `GastosCartaoService` tipado
- [ ] Substituir `context().autoArbitragem` → estado no `AutoArbitrageService`
- [ ] Substituir `context().jogo` / `jogoAberto` → `QuizService` / `JogoBichoService`
- [ ] Migrar `src/bot.js` → `src/bot.ts` (entry point principal)
- [ ] Migrar `src/global-exception-handler.js` → `.ts`
- [ ] Migrar `src/observability/Sentry.js` → `.ts`
- [ ] Deletar `src/context.js`
- [ ] Habilitar `"allowJs": false` no `tsconfig.json`
- [ ] Verificar cobertura de testes ≥ 80% no total

**Critério de conclusão:** Zero arquivos `.js` em `src/`. Build sem `allowJs`.

---

## Métricas de progresso

| Métrica | Início | Atual | Meta |
|---|---|---|---|
| Arquivos TypeScript em `src/` | 0 | 29 | 135 |
| Arquivos JavaScript em `src/` | 135 | 106 | 0 |
| Cobertura de testes (arquivos TS) | 0% | 97.91% | ≥ 80% |
| Testes automatizados | 0 | 76 | ≥ 150 |
| `allowJs` no tsconfig | `true` | `true` | `false` |

---

## Decisões técnicas fixas

| Decisão | Rationale |
|---|---|
| Autorização por **User ID** (não username) | Username é mutável no Discord |
| **Zod** para validação de args e env | Erros explícitos em runtime, schema reutilizável em testes |
| **Result<T,E>** em vez de throw | Erros de domínio são valores, não exceções |
| **Injeção de dependência** nos services | Testabilidade sem mocks globais |
| **Imutabilidade** nas entidades de domínio | Previne bugs de estado compartilhado |
| `node-cron` em vez de engine customizada | ~400 linhas deletadas, package mantido pela comunidade |
| **pino** como logger | Structured logging, child loggers por módulo |
