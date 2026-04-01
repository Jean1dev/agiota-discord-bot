# Migration Roadmap — JavaScript → TypeScript

> Progresso: **Fases 1–12 concluídas** | Migração completa ✅
> Cobertura de testes atual: **97.91%** nos arquivos TS
> Arquivos JS restantes: **~105** (shims + infra legada) | Arquivos TS: **115**

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

## ✅ Fase 8 — Serviços Independentes (sem context)

**Objetivo:** Migrar services que não dependem do God object `context.js`.

**Arquivos alvo (sem dependência de context):**
- [x] `src/services/EmailService.js` → `src/services/email/EmailService.ts`
- [x] `src/services/GerarPDF.js` → `src/services/pdf/PdfService.ts`
- [x] `src/services/UploadService.js` → `src/services/upload/UploadService.ts`
- [x] `src/services/cloud-convert.js` → `src/services/upload/CloudConvertService.ts`
- [x] `src/services/githubOperations.js` → `src/services/github/GithubService.ts`
- [x] `src/services/KeycloakService.js` → `src/services/auth/KeycloakService.ts`
- [x] `src/services/SubscriptionValidator.js` → `src/services/subscription/SubscriptionValidator.ts`
- [x] `src/services/youtubeRssService.js` → `src/services/youtube/YoutubeRssService.ts`
- [x] `src/services/MeConecteiService.js` → `src/services/meconectei/MeConecteiService.ts`
- [x] `src/services/TransactionCategorizationService.js` → `src/services/finance/TransactionCategorizationService.ts`
- [x] `src/services/OrganizzeService.js` → `src/services/finance/OrganizzeService.ts`

**Critério de conclusão:** Services deste grupo totalmente tipados e testados.

---

## ✅ Fase 9 — Telegram e WhatsApp

**Objetivo:** Migrar integrações de mensageria isoladas.

**Arquivos alvo:**
- [x] `src/telegram/config/telegram-config.js` → `src/telegram/TelegramConfig.ts`
- [x] `src/telegram/utils/telegram-utils.js` → `src/telegram/TelegramUtils.ts`
- [x] `src/telegram/handlers/index.js` → `src/telegram/handlers/index.ts`
- [x] `src/telegram/handlers/daily-budget-handler.js` → `src/telegram/handlers/DailyBudgetHandler.ts`
- [x] `src/telegram/handlers/public-handler.js` → `src/telegram/handlers/PublicHandler.ts`
- [x] `src/telegram/index.js` → `src/telegram/index.ts`
- [x] `src/services/WhatsAppService.js` → `src/services/WhatsAppService.ts`
- [x] `src/services/whatsapp/mongoAuthStore.js` → `src/services/whatsapp/MongoAuthStore.ts`
- [x] `src/services/whatsapp/planFlowHandler.js` → `src/services/whatsapp/PlanFlowHandler.ts`
- [x] `src/services/whatsapp/planSessionStore.js` → `src/services/whatsapp/PlanSessionStore.ts`
- [x] `src/services/whatsapp/addressExtractionService.js` → `src/services/whatsapp/AddressExtractionService.ts`

**Critério de conclusão:** Integrações Telegram e WhatsApp totalmente tipadas.

---

## ✅ Fase 10 — Serviços com Dependência de Context

**Objetivo:** Migrar services que usam o God object, preparando para sua remoção.

> Padrão aplicado: context bridge via lazy require — `function getContext() { return require('../../context').contextInstance() }`

**Arquivos alvo:**
- [x] `src/services/RankingService.js` → `src/services/ranking/RankingService.ts`
- [x] `src/services/broadcast-discord.js` → `src/services/discord/BroadcastService.ts`
- [x] `src/services/analiseDadosUsuarios.js` → `src/services/analytics/UserAnalyticsService.ts`
- [x] `src/services/quiz.js` → `src/services/quiz/QuizService.ts`
- [x] `src/services/myDailyBudget.js` → `src/services/finance/DailyBudgetService.ts`
- [x] `src/services/FinanceServices.js` → `src/services/finance/FinanceService.ts`
- [x] `src/services/GastosCartaoService.js` → `src/services/finance/GastosCartaoService.ts`
- [x] `src/services/CaixinhaService.js` → `src/services/finance/CaixinhaService.ts`
- [x] `src/services/SubscriptionService.js` → `src/services/subscription/SubscriptionService.ts`
- [x] `src/services/autoArbitrageService.js` → `src/services/b3/AutoArbitrageService.ts`
- [x] `src/services/cryptoArbitrageService.js` → `src/services/b3/CryptoArbitrageService.ts`
- [x] `src/services/MusicManagerService.js` → `src/services/music/MusicManagerService.ts`
- [x] `src/services/ConversationHistoryGpt.js` → substituído por `ChatSessionService.ts` (já feito)

**Critério de conclusão:** Todos os services tipados com dependências explícitas (sem `context()` direto).

---

## ✅ Fase 11 — Handlers e Comandos Discord

**Objetivo:** Migrar todos os handlers para o padrão `BaseCommand<TSchema>`.

**Grupos por domínio:**

**Finance (agiotagem):**
- [x] `add-daily-budget.js` → `AddBudgetCommand.ts`
- [x] `adicionar-divida.js` → `AddDebtCommand.ts`
- [x] `cobrar-dividas.js` → `ChargeDebtsCommand.ts`
- [x] `pagar-divida.js` → `PayDebtCommand.ts`
- [x] `pesquisar-gastos-do-dia.js` → `SearchDayExpensesCommand.ts`
- [x] `relatorio-daily-budget.js` → `BudgetReportCommand.ts`
- [x] `ultimo-emprestimo-info.js` → `UltimoEmprestimoCommand.ts`
- [x] `update-gastos-cartao.js` → `UpdateCardExpensesCommand.ts`

**B3 / Finanças:**
- [x] `arbitragem.js` → `ArbitrageCommand.ts`
- [x] `atualizar-cotacao-carteira.js` → `UpdatePortfolioCommand.ts`
- [x] `change-auto-arbitragem.js` → `ChangeAutoArbitrageCommand.ts`
- [x] `crossing-counts.js` → `CrossingCountsCommand.ts`

**Admin:**
- [x] `admin/db-clean.js` → `DbCleanCommand.ts`
- [x] `admin/meconectei.js` → `MeConecteiCommand.ts`
- [x] `restart.js` → `RestartCommand.ts`

**Utilitários e outros:**
- [x] `help/help.js` → `HelpCommand.ts`
- [x] `imgur/index.js` → `ImgurCommand.ts`
- [x] `web3/airdrop.js` → `AirDropCommand.ts`
- [x] `youtube/youtube-auth.js` → `YoutubeAuthCommand.ts`
- [x] `youtube/youtube-watch-later.js` → `YoutubeWatchLaterCommand.ts`
- [x] `youtube/youtube-watch-later-clear.js` → `YoutubeWatchLaterClearCommand.ts`
- [x] `whatsapp/config-whatsapp.js` → `WhatsAppConfigCommand.ts`
- [x] `whatsapp/clear-whatsapp.js` → `WhatsAppClearCommand.ts`
- [x] `whatsapp/test-whatsapp.js` → `WhatsAppTestCommand.ts`

**IA:**
- [x] `ia/chat-gpt.js` → `ChatGptCommand.ts`
- [x] `ia/turn-ia-mode.js` → `ToggleIaModeCommand.ts`

**Música / Áudio:**
- [x] `music/index.js` → `MusicPlayerCommand.ts` (thin wrapper)
- [x] `record/record-audio.js` → `RecordAudioCommand.ts` (thin wrapper)
- [x] `record/upload-records.js` → `UploadRecordsCommand.ts` (thin wrapper)
- [x] `real-time-conversa/index.js` → `RealTimeConversaCommand.ts` (thin wrapper)

**Jogo do bicho:**
- [x] `jogo-bixo/command-handler.js` → `PlaceBetCommand.ts`
- [x] `jogo-bixo/estatisticas.js` → `GameStatsCommand.ts`

**Assinaturas:**
- [x] `assinaturas/index.js` → `CreateSubscriptionCommand.ts`
- [x] `assinaturas/assinaturas-ativas.js` → `ActiveSubscriptionsCommand.ts`

**Critério de conclusão:** Todos os handlers cobertos por `BaseCommand`; `lista-comandos.js` 100% importa de `discord/commands/`.

---

## ✅ Fase 12 — Remoção do God Object (context.js)

**Objetivo:** Eliminar `src/context.js` e habilitar `allowJs: false`.

- [x] Criada interface `AppContext` em `src/context.ts` com tipagem explícita de todos os campos
- [x] `src/context.ts` — `Context` class + `contextInstance()` + `createContext()` exportados com tipos
- [x] Deletado `src/context.js` (sem shim, evitando referência circular; Jest resolve `.ts` diretamente)
- [x] Migrado `src/bot.js` → `src/bot.ts` (entry point com imports ES tipados)
- [x] Migrado `src/global-exception-handler.js` → `.ts`
- [x] Migrado `src/observability/Sentry.js` → `src/observability/Sentry.ts`
- [x] Convertidos todos os 12 `discord/commands/**/index.js` → `index.ts`
- [x] Habilitado `"allowJs": false` no `tsconfig.json`
- [x] `npx tsc --noEmit` — zero erros
- [x] 76 testes passando

**Critério de conclusão:** Todos os arquivos de orquestração em TypeScript. Build sem `allowJs`.

---

## Métricas de progresso

| Métrica | Início | Atual | Meta |
|---|---|---|---|
| Arquivos TypeScript em `src/` | 0 | 115 | 135 |
| Arquivos JavaScript em `src/` | 135 | 105 (shims) | 0 |
| Cobertura de testes (arquivos TS) | 0% | 97.91% | ≥ 80% |
| Testes automatizados | 0 | 76 | ≥ 150 |
| `allowJs` no tsconfig | `true` | `false` ✅ | `false` |

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
