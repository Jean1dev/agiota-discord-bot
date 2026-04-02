# Migration Roadmap — JavaScript → TypeScript

> Progresso: **Fases 1–12 concluídas** | Migração completa ✅
> Cobertura de testes atual: **97.91%** nos arquivos TS
> Arquivos JS restantes: **~105** (shims + infra legada) | Arquivos TS: **115**

---

## Legenda de status


| Símbolo | Significado  |
| ------- | ------------ |
| ✅       | Concluído    |
| 🔄      | Em andamento |
| ⬜       | Pendente     |


---

## ✅ Fase 1 — Foundation (TypeScript + Infraestrutura)

**Objetivo:** Preparar o terreno para a migração sem quebrar nada.

- `tsconfig.json` com `allowJs: true`, `strict: true`, paths aliases (`@domain/`*, `@shared/*`, etc.)
- `tsconfig.test.json` para ambiente Jest
- `jest.config.js` com ts-jest
- `src/shared/logger/Logger.ts` — pino com child loggers
- `src/domain/shared/Result.ts` — monad Result<T,E>
- `src/config/env.ts` — validação de variáveis de ambiente com Zod (fail-fast)
- `src/infrastructure/database/MongoConnection.ts` — singleton tipado
- `.env.example` com `ADMIN_DISCORD_USER_IDS`

---

## ✅ Fase 2 — Debt Domain (Domínio de Dívidas)

**Objetivo:** Migrar o domínio mais crítico do bot com clean architecture.

- `src/domain/debt/Debt.ts` — value object imutável (`create` + `reconstitute`)
- `src/domain/debt/DebtUser.ts` — aggregate com mutations imutáveis
- `src/domain/debt/IDebtRepository.ts` — interface do repositório
- `src/infrastructure/database/MongoDebtRepository.ts` — mapeamento legacy schema ↔ domain
- `src/application/debt/AddDebtUseCase.ts`
- `src/application/debt/PayDebtUseCase.ts`
- Testes: `AddDebtUseCase`, `PayDebtUseCase`, `DebtUser`

---

## ✅ Fase 3 — Guards e Segurança

**Objetivo:** Corrigir autorização baseada em username (mutável) → User ID (imutável).

- `src/discord/guards/AuthorizationService.ts` — lê `ADMIN_DISCORD_USER_IDS` do env
- `src/discord/guards/AdminGuard.ts` — decorator `protect()` + `requireAdminById()` standalone
- `src/discord/guards/RateLimitGuard.ts` — fixed-window por userId
- `src/handlers/guard-handler.js` substituído — todos os 13 handlers corrigidos de uma vez
- Testes: `AdminGuard`, `RateLimitGuard`, `AuthorizationService`

---

## ✅ Fase 4 — Remaining Domains (Comandos e Serviços Core)

**Objetivo:** Infraestrutura de comandos tipada + corrigir bugs críticos.

- `src/discord/commands/BaseCommand.ts` — abstract genérico com Zod + rate limit
- `src/services/ai/ChatSessionService.ts` — histórico limitado (TTL + maxMessages), fix memory leak
- `src/discord/commands/ai/ChatGptCommand.ts` — usa ChatSessionService
- Comandos finance, b3, admin, subscriptions — todos wrapados com AdminGuard
- `src/services/GastosCartaoService.js` — removido setTimeout fire-and-forget (race condition)
- Testes: `ChatSessionService`, `BaseCommand`

---

## ✅ Fase 5 — Scheduler (Jobs Agendados)

**Objetivo:** Substituir engine cron customizada (~400 linhas) por npm `node-cron`.

- Instalado `node-cron` + `@types/node-cron`
- `src/scheduler/IJob.ts` — interface comum
- `src/scheduler/JobScheduler.ts` — wrapper tipado com logging estruturado
- `src/scheduler/jobs/HourlyJob.ts` — `0 * * * `*
- `src/scheduler/jobs/MidnightJob.ts` — `10 23 * * *`
- `src/scheduler/jobs/WeekendReportJob.ts` — `15 11 * * 1`
- `src/scheduler/jobs/DailyBudgetJob.ts` — `5 22 * * *`
- `src/scheduler/jobs/QuizJob.ts` — `2 9-19/3 * * 1-3`
- `src/scheduler/jobs/YoutubeRssJob.ts` — `16 8 * * 1-6`
- Removido `src/schedules/` (15 arquivos)

---

## ✅ Fase 6 — Cleanup e Cobertura de Testes

**Objetivo:** Remover código morto, atingir ≥70% de cobertura nos arquivos TS.

- Deletado `src/schedules/` (engine cron customizada)
- Testes para `BaseCommand` — rate limit, validação, erro no handle, adapters legacy
- Testes para `requireAdminById` — ambos overloads (com e sem args)
- Cobertura: 83.85% → **97.91%** statements
- `coverage/` e `dist/` adicionados ao `.gitignore`
- CI: fix `jest.config.ts` → `.js` (Node 21 compatibility)
- CI: fix TypeScript 6 → 5.8 (ts-jest peer dep)
- CI: fix `ffmpeg-static` download no install (`--ignore-scripts`)

---

## ✅ Fase 7 — Repositório e Utilitários

**Objetivo:** Migrar camada de acesso a dados e helpers sem dependência do context.

**Arquivos alvo:**

- `src/repository/mongodb.js` → `src/infrastructure/database/MongoRepository.ts`
- `src/repository/operations.js` → shim (delega para MongoRepository.ts)
- `src/discord-constants.js` → `src/discord/DiscordConstants.ts`
- `src/utils/utils.js` → `src/shared/utils/utils.ts`
- `src/utils/feriados-br.js` → `src/shared/utils/feriados-br.ts`
- `src/utils/discord-nicks-default.js` → `src/shared/utils/discord-nicks-default.ts`
- `src/app-events.js` → `src/shared/events/AppEvents.ts` (typed EventEmitter; listeners AMQP permanecem em JS)
- `src/config.js` → shim mapeando `src/config/env.ts` para nomes legados

**Critério de conclusão:** Nenhum arquivo TS importando `.js` para funções utilitárias.

---

## ✅ Fase 8 — Serviços Independentes (sem context)

**Objetivo:** Migrar services que não dependem do God object `context.js`.

**Arquivos alvo (sem dependência de context):**

- `src/services/EmailService.js` → `src/services/email/EmailService.ts`
- `src/services/GerarPDF.js` → `src/services/pdf/PdfService.ts`
- `src/services/UploadService.js` → `src/services/upload/UploadService.ts`
- `src/services/cloud-convert.js` → `src/services/upload/CloudConvertService.ts`
- `src/services/githubOperations.js` → `src/services/github/GithubService.ts`
- `src/services/KeycloakService.js` → `src/services/auth/KeycloakService.ts`
- `src/services/SubscriptionValidator.js` → `src/services/subscription/SubscriptionValidator.ts`
- `src/services/youtubeRssService.js` → `src/services/youtube/YoutubeRssService.ts`
- `src/services/MeConecteiService.js` → `src/services/meconectei/MeConecteiService.ts`
- `src/services/TransactionCategorizationService.js` → `src/services/finance/TransactionCategorizationService.ts`
- `src/services/OrganizzeService.js` → `src/services/finance/OrganizzeService.ts`

**Critério de conclusão:** Services deste grupo totalmente tipados e testados.

---

## ✅ Fase 9 — Telegram e WhatsApp

**Objetivo:** Migrar integrações de mensageria isoladas.

**Arquivos alvo:**

- `src/telegram/config/telegram-config.js` → `src/telegram/TelegramConfig.ts`
- `src/telegram/utils/telegram-utils.js` → `src/telegram/TelegramUtils.ts`
- `src/telegram/handlers/index.js` → `src/telegram/handlers/index.ts`
- `src/telegram/handlers/daily-budget-handler.js` → `src/telegram/handlers/DailyBudgetHandler.ts`
- `src/telegram/handlers/public-handler.js` → `src/telegram/handlers/PublicHandler.ts`
- `src/telegram/index.js` → `src/telegram/index.ts`
- `src/services/WhatsAppService.js` → `src/services/WhatsAppService.ts`
- `src/services/whatsapp/mongoAuthStore.js` → `src/services/whatsapp/MongoAuthStore.ts`
- `src/services/whatsapp/planFlowHandler.js` → `src/services/whatsapp/PlanFlowHandler.ts`
- `src/services/whatsapp/planSessionStore.js` → `src/services/whatsapp/PlanSessionStore.ts`
- `src/services/whatsapp/addressExtractionService.js` → `src/services/whatsapp/AddressExtractionService.ts`

**Critério de conclusão:** Integrações Telegram e WhatsApp totalmente tipadas.

---

## ✅ Fase 10 — Serviços com Dependência de Context

**Objetivo:** Migrar services que usam o God object, preparando para sua remoção.

> Padrão aplicado: context bridge via lazy require — `function getContext() { return require('../../context').contextInstance() }`

**Arquivos alvo:**

- `src/services/RankingService.js` → `src/services/ranking/RankingService.ts`
- `src/services/broadcast-discord.js` → `src/services/discord/BroadcastService.ts`
- `src/services/analiseDadosUsuarios.js` → `src/services/analytics/UserAnalyticsService.ts`
- `src/services/quiz.js` → `src/services/quiz/QuizService.ts`
- `src/services/myDailyBudget.js` → `src/services/finance/DailyBudgetService.ts`
- `src/services/FinanceServices.js` → `src/services/finance/FinanceService.ts`
- `src/services/GastosCartaoService.js` → `src/services/finance/GastosCartaoService.ts`
- `src/services/CaixinhaService.js` → `src/services/finance/CaixinhaService.ts`
- `src/services/SubscriptionService.js` → `src/services/subscription/SubscriptionService.ts`
- `src/services/autoArbitrageService.js` → `src/services/b3/AutoArbitrageService.ts`
- `src/services/cryptoArbitrageService.js` → `src/services/b3/CryptoArbitrageService.ts`
- `src/services/MusicManagerService.js` → `src/services/music/MusicManagerService.ts`
- `src/services/ConversationHistoryGpt.js` → substituído por `ChatSessionService.ts` (já feito)

**Critério de conclusão:** Todos os services tipados com dependências explícitas (sem `context()` direto).

---

## ✅ Fase 11 — Handlers e Comandos Discord

**Objetivo:** Migrar todos os handlers para o padrão `BaseCommand<TSchema>`.

**Grupos por domínio:**

**Finance (agiotagem):**

- `add-daily-budget.js` → `AddBudgetCommand.ts`
- `adicionar-divida.js` → `AddDebtCommand.ts`
- `cobrar-dividas.js` → `ChargeDebtsCommand.ts`
- `pagar-divida.js` → `PayDebtCommand.ts`
- `pesquisar-gastos-do-dia.js` → `SearchDayExpensesCommand.ts`
- `relatorio-daily-budget.js` → `BudgetReportCommand.ts`
- `ultimo-emprestimo-info.js` → `UltimoEmprestimoCommand.ts`
- `update-gastos-cartao.js` → `UpdateCardExpensesCommand.ts`

**B3 / Finanças:**

- `arbitragem.js` → `ArbitrageCommand.ts`
- `atualizar-cotacao-carteira.js` → `UpdatePortfolioCommand.ts`
- `change-auto-arbitragem.js` → `ChangeAutoArbitrageCommand.ts`
- `crossing-counts.js` → `CrossingCountsCommand.ts`

**Admin:**

- `admin/db-clean.js` → `DbCleanCommand.ts`
- `admin/meconectei.js` → `MeConecteiCommand.ts`
- `restart.js` → `RestartCommand.ts`

**Utilitários e outros:**

- `help/help.js` → `HelpCommand.ts`
- `imgur/index.js` → `ImgurCommand.ts`
- `web3/airdrop.js` → `AirDropCommand.ts`
- `youtube/youtube-auth.js` → `YoutubeAuthCommand.ts`
- `youtube/youtube-watch-later.js` → `YoutubeWatchLaterCommand.ts`
- `youtube/youtube-watch-later-clear.js` → `YoutubeWatchLaterClearCommand.ts`
- `whatsapp/config-whatsapp.js` → `WhatsAppConfigCommand.ts`
- `whatsapp/clear-whatsapp.js` → `WhatsAppClearCommand.ts`
- `whatsapp/test-whatsapp.js` → `WhatsAppTestCommand.ts`

**IA:**

- `ia/chat-gpt.js` → `ChatGptCommand.ts`
- `ia/turn-ia-mode.js` → `ToggleIaModeCommand.ts`

**Música / Áudio:**

- `music/index.js` → `MusicPlayerCommand.ts` (thin wrapper)
- `record/record-audio.js` → `RecordAudioCommand.ts` (thin wrapper)
- `record/upload-records.js` → `UploadRecordsCommand.ts` (thin wrapper)
- `real-time-conversa/index.js` → `RealTimeConversaCommand.ts` (thin wrapper)

**Jogo do bicho:**

- `jogo-bixo/command-handler.js` → `PlaceBetCommand.ts`
- `jogo-bixo/estatisticas.js` → `GameStatsCommand.ts`

**Assinaturas:**

- `assinaturas/index.js` → `CreateSubscriptionCommand.ts`
- `assinaturas/assinaturas-ativas.js` → `ActiveSubscriptionsCommand.ts`

**Critério de conclusão:** Todos os handlers cobertos por `BaseCommand`; `lista-comandos.js` 100% importa de `discord/commands/`.

---

## ✅ Fase 12 — Remoção do God Object (context.js)

**Objetivo:** Eliminar `src/context.js` e habilitar `allowJs: false`.

- Criada interface `AppContext` em `src/context.ts` com tipagem explícita de todos os campos
- `src/context.ts` — `Context` class + `contextInstance()` + `createContext()` exportados com tipos
- Deletado `src/context.js` (sem shim, evitando referência circular; Jest resolve `.ts` diretamente)
- Migrado `src/bot.js` → `src/bot.ts` (entry point com imports ES tipados)
- Migrado `src/global-exception-handler.js` → `.ts`
- Migrado `src/observability/Sentry.js` → `src/observability/Sentry.ts`
- Convertidos todos os 12 `discord/commands/**/index.js` → `index.ts`
- Habilitado `"allowJs": false` no `tsconfig.json`
- `npx tsc --noEmit` — zero erros
- 76 testes passando

**Critério de conclusão:** Todos os arquivos de orquestração em TypeScript. Build sem `allowJs`.

---

## Métricas de progresso


| Métrica                           | Início | Atual       | Meta    |
| --------------------------------- | ------ | ----------- | ------- |
| Arquivos TypeScript em `src/`     | 0      | 115         | 135     |
| Arquivos JavaScript em `src/`     | 135    | 105 (shims) | 0       |
| Cobertura de testes (arquivos TS) | 0%     | 97.91%      | ≥ 80%   |
| Testes automatizados              | 0      | 76          | ≥ 150   |
| `allowJs` no tsconfig             | `true` | `false` ✅   | `false` |


---

## Decisões técnicas fixas


| Decisão                                    | Rationale                                                  |
| ------------------------------------------ | ---------------------------------------------------------- |
| Autorização por **User ID** (não username) | Username é mutável no Discord                              |
| **Zod** para validação de args e env       | Erros explícitos em runtime, schema reutilizável em testes |
| **Result<T,E>** em vez de throw            | Erros de domínio são valores, não exceções                 |
| **Injeção de dependência** nos services    | Testabilidade sem mocks globais                            |
| **Imutabilidade** nas entidades de domínio | Previne bugs de estado compartilhado                       |
| `node-cron` em vez de engine customizada   | ~400 linhas deletadas, package mantido pela comunidade     |
| **pino** como logger                       | Structured logging, child loggers por módulo               |


