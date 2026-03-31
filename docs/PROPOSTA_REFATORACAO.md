# Proposta de Refatoração — Agiota Discord Bot

> Documento elaborado após análise completa do codebase (~4.500 linhas, 130+ arquivos).

---

## 1. Diagnóstico da Situação Atual

### Problemas Críticos

| Categoria | Problema | Impacto |
|---|---|---|
| **Segurança** | Autorização por username hardcoded (`JEANLUCAFP_NICK`) | Alto |
| **Segurança** | Sem validação de inputs nos handlers | Alto |
| **Arquitetura** | God-object `Context` acumula estado de features não relacionadas | Alto |
| **Confiabilidade** | `context().save()` fire-and-forget sem `await` — race conditions | Alto |
| **Manutenibilidade** | Zero testes automatizados | Alto |
| **Tipo** | JavaScript puro — bugs de tipo só aparecem em runtime | Médio |
| **Vazamento de memória** | `conversationHistory` cresce indefinidamente | Médio |
| **Acoplamento** | `DbInstance()` chamado diretamente fora do repositório | Médio |
| **Observabilidade** | `console.log` misturado com lógica de negócio sem níveis de log | Baixo |
| **Performance** | Sem índices MongoDB; sem cache; queries N+1 possíveis | Médio |

### Mapa de Dependências Atual (simplificado)

```
index.js
  └─ bot.js          ← monta tudo (Discord client, DB, WhatsApp, jobs)
       ├─ context.js ← God-object (dividas + jogo + arbitragem + gravações)
       ├─ commands/  ← dispatch por string
       ├─ handlers/  ← 30+ handlers sem contrato definido
       ├─ services/  ← lógica misturada (alguns são classes, outros módulos soltos)
       └─ repository/← wrapper fraco; DB acessado diretamente em vários pontos
```

---

## 2. Visão Geral da Proposta

### Princípios Guia

1. **TypeScript estrito** — `strict: true`, sem `any` implícito.
2. **Single Responsibility** — cada arquivo faz uma coisa.
3. **Dependency Injection** — dependências passadas explicitamente; fácil de testar e substituir.
4. **Repository + Service pattern** — camadas bem definidas; nenhum handler fala com o DB diretamente.
5. **Command Pattern para handlers Discord** — cada comando é uma classe com schema de validação.
6. **Falha rápida + erros tipados** — `Result<T, E>` ao invés de throws silenciosos.
7. **Testes primeiro** — arquitetura pensada para testabilidade desde o início.

---

## 3. Estrutura de Diretórios Proposta

```
agiota-discord-bot/
├── src/
│   ├── bootstrap/               # Inicialização e composição de dependências
│   │   ├── container.ts         # IoC container (tsyringe ou manual)
│   │   ├── discord-client.ts    # Criação e configuração do Discord Client
│   │   └── app.ts               # Ponto de entrada: conecta tudo
│   │
│   ├── config/
│   │   └── env.ts               # Zod schema validando todas as vars de ambiente
│   │
│   ├── domain/                  # Regras de negócio puras (sem dependências externas)
│   │   ├── debt/
│   │   │   ├── Debt.ts          # Entidade Debt (value objects + invariantes)
│   │   │   ├── DebtUser.ts      # Agregado
│   │   │   └── IDebtRepository.ts
│   │   ├── game/
│   │   │   ├── JogoBixo.ts
│   │   │   └── IJogoRepository.ts
│   │   ├── finance/
│   │   │   ├── DailyBudget.ts
│   │   │   └── IFinanceRepository.ts
│   │   └── shared/
│   │       ├── Result.ts        # Result<T, E> para erros explícitos
│   │       └── DomainError.ts
│   │
│   ├── application/             # Casos de uso (orquestra domain + infra)
│   │   ├── debt/
│   │   │   ├── AddDebtUseCase.ts
│   │   │   ├── PayDebtUseCase.ts
│   │   │   └── ListDebtsUseCase.ts
│   │   ├── game/
│   │   │   └── PlaceBetUseCase.ts
│   │   ├── finance/
│   │   │   ├── AddBudgetEntryUseCase.ts
│   │   │   └── GenerateReportUseCase.ts
│   │   └── ai/
│   │       └── ChatUseCase.ts
│   │
│   ├── infrastructure/          # Implementações concretas (DB, APIs externas)
│   │   ├── database/
│   │   │   ├── MongoConnection.ts
│   │   │   ├── MongoDebtRepository.ts
│   │   │   └── MongoGameRepository.ts
│   │   ├── external/
│   │   │   ├── OpenAiClient.ts
│   │   │   ├── FinanceApiClient.ts   # Substitui FinanceServices.js
│   │   │   └── CryptoApiClient.ts
│   │   └── cache/
│   │       └── InMemoryCache.ts
│   │
│   ├── discord/                 # Adaptador Discord (presentation layer)
│   │   ├── BotClient.ts
│   │   ├── CommandRouter.ts     # Substitui commands/index.js
│   │   ├── guards/
│   │   │   ├── AdminGuard.ts    # Substitui guard-handler.js
│   │   │   └── RateLimitGuard.ts
│   │   └── commands/            # Um arquivo por comando
│   │       ├── BaseCommand.ts   # Interface/classe abstrata
│   │       ├── debt/
│   │       │   ├── AddDebtCommand.ts
│   │       │   ├── PayDebtCommand.ts
│   │       │   └── ChargeDebtCommand.ts
│   │       ├── finance/
│   │       │   ├── AddBudgetCommand.ts
│   │       │   └── BudgetReportCommand.ts
│   │       ├── game/
│   │       │   └── PlaceBetCommand.ts
│   │       └── ai/
│   │           └── ChatCommand.ts
│   │
│   ├── telegram/                # Adaptador Telegram (estrutura similar ao discord/)
│   │   ├── TelegramBot.ts
│   │   └── commands/
│   │
│   ├── scheduler/               # Jobs agendados
│   │   ├── JobScheduler.ts
│   │   └── jobs/
│   │       ├── ArbitrageJob.ts
│   │       ├── RankingJob.ts
│   │       └── YoutubeRssJob.ts
│   │
│   └── shared/
│       ├── logger/
│       │   └── Logger.ts        # Wrapper sobre pino ou winston
│       ├── errors/
│       │   └── AppError.ts
│       └── types/
│           └── index.ts         # Tipos globais reutilizáveis
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   └── integration/
│       └── infrastructure/
│
├── tsconfig.json
├── jest.config.ts
└── package.json
```

---

## 4. Mudanças Arquiteturais Chave

### 4.1 God-Object `Context` → Estado Distribuído

**Problema atual:**
```javascript
// context.js — uma classe que sabe de tudo
class Context {
  dividas       // domínio: dívidas
  client        // infraestrutura: Discord client
  gravacoes     // domínio: áudio
  jogoAberto    // domínio: jogo
  autoArbitragem// domínio: crypto
  conversationHistory // domínio: IA
  totalGastoCartao    // domínio: finanças
}
```

**Proposta:** Cada domínio gerencia seu próprio estado.

```typescript
// src/domain/debt/DebtUser.ts
export interface Debt {
  readonly id: string
  readonly value: number
  readonly description: string
  readonly lender: string
  readonly createdAt: Date
}

export class DebtUser {
  constructor(
    readonly id: string,
    private readonly debts: Debt[],
    private readonly payments: Payment[],
  ) {}

  addDebt(debt: Omit<Debt, 'id' | 'createdAt'>): DebtUser {
    // retorna nova instância — imutável
    return new DebtUser(
      this.id,
      [...this.debts, { ...debt, id: crypto.randomUUID(), createdAt: new Date() }],
      this.payments,
    )
  }

  get totalOwed(): number {
    const totalDebt = this.debts.reduce((sum, d) => sum + d.value, 0)
    const totalPaid = this.payments.reduce((sum, p) => sum + p.value, 0)
    return totalDebt - totalPaid
  }
}
```

```typescript
// src/discord/BotClient.ts — Discord Client isolado
export class BotClient {
  constructor(private readonly client: Client) {}

  getChannel(name: string): TextChannel | null {
    return (this.client.channels.cache.find(
      (c): c is TextChannel => c.type === 'GUILD_TEXT' && c.name === name
    )) ?? null
  }
}
```

---

### 4.2 Handlers Sem Contrato → Command Pattern Tipado

**Problema atual:**
```javascript
// Sem tipagem, sem validação, sem contrato
module.exports = async (args, message) => {
  const valorDivida = args[0]   // pode ser qualquer coisa
  const userId = args[1]        // pode ser undefined
  // ...
}
```

**Proposta:**
```typescript
// src/discord/commands/BaseCommand.ts
import { z } from 'zod'
import type { Message } from 'discord.js'

export interface CommandContext {
  message: Message
  args: string[]
}

export abstract class BaseCommand<TSchema extends z.ZodType> {
  abstract readonly name: string
  abstract readonly description: string
  protected abstract readonly schema: TSchema

  async execute(ctx: CommandContext): Promise<void> {
    const parsed = this.schema.safeParse(ctx.args)
    if (!parsed.success) {
      await ctx.message.reply(`Uso incorreto: ${this.getUsage()}`)
      return
    }
    await this.handle(ctx.message, parsed.data)
  }

  protected abstract handle(message: Message, data: z.infer<TSchema>): Promise<void>
  protected abstract getUsage(): string
}
```

```typescript
// src/discord/commands/debt/AddDebtCommand.ts
import { z } from 'zod'
import { BaseCommand } from '../BaseCommand'
import type { AddDebtUseCase } from '../../../application/debt/AddDebtUseCase'

const schema = z.tuple([
  z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido').transform(Number),
  z.string().min(1, 'ID do usuário obrigatório'),
  z.string().optional(), // descrição
]).rest(z.string())

export class AddDebtCommand extends BaseCommand<typeof schema> {
  readonly name = 'adicionardivida'
  readonly description = 'Adiciona uma dívida para um usuário'
  protected readonly schema = schema

  constructor(private readonly addDebtUseCase: AddDebtUseCase) {
    super()
  }

  protected async handle(message: Message, [value, userId, ...rest]: z.infer<typeof schema>) {
    const description = rest.join(' ')
    const result = await this.addDebtUseCase.execute({
      value,
      userId,
      description,
      lender: message.author.username,
    })

    if (result.isErr()) {
      await message.reply(`Erro ao adicionar dívida: ${result.error.message}`)
      return
    }

    await message.reply('Dívida adicionada com sucesso.')
  }

  protected getUsage() {
    return '`$adicionardivida <valor> <userId> [descrição]`'
  }
}
```

---

### 4.3 Autorização por Username → Guard Baseado em Roles

**Problema atual:**
```javascript
// guard-handler.js — hardcoded, impossível de testar, não escala
if (myName !== JEANLUCAFP_NICK) {
    discordMessage.reply("Você não tem permissão")
    return
}
```

**Proposta:**
```typescript
// src/discord/guards/AdminGuard.ts
export interface AuthorizationService {
  isAdmin(userId: string): Promise<boolean>
}

export class AdminGuard {
  constructor(private readonly auth: AuthorizationService) {}

  wrap<T>(
    handler: (ctx: CommandContext, data: T) => Promise<void>
  ): (ctx: CommandContext, data: T) => Promise<void> {
    return async (ctx, data) => {
      const allowed = await this.auth.isAdmin(ctx.message.author.id)
      if (!allowed) {
        await ctx.message.reply('Você não tem permissão para executar esse comando.')
        return
      }
      await handler(ctx, data)
    }
  }
}

// src/infrastructure/auth/ConfigAuthorizationService.ts
export class ConfigAuthorizationService implements AuthorizationService {
  constructor(private readonly adminIds: Set<string>) {}

  async isAdmin(userId: string): Promise<boolean> {
    return this.adminIds.has(userId)
  }
}
```

> Configurar admin por **Discord User ID** (numérico, imutável) via env var `ADMIN_USER_IDS=123,456`.
> O `username` muda; o `id` não.

---

### 4.4 `save()` Fire-and-Forget → Operações Await Corretas

**Problema atual:**
```javascript
// Sem await — o processo pode terminar antes de salvar
context().dividas.push(...)
context().save()  // ← fire and forget
```

**Proposta:**
```typescript
// src/application/debt/AddDebtUseCase.ts
export class AddDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(dto: AddDebtDto): Promise<Result<DebtUser, DomainError>> {
    const user = await this.debtRepo.findById(dto.userId)
    const debtUser = user ?? new DebtUser(dto.userId, [], [])
    const updated = debtUser.addDebt(dto)

    await this.debtRepo.save(updated)  // ← sempre awaited

    return Result.ok(updated)
  }
}
```

---

### 4.5 Validação de Ambiente com Zod

**Problema atual:**
```javascript
// config.js — falha silenciosa se var não existir
module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,  // pode ser undefined
}
```

**Proposta:**
```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  BOT_TOKEN:        z.string().min(1),
  MONGO_URL:        z.string().url(),
  NODE_ENV:         z.enum(['dev', 'prod', 'test']).default('dev'),
  OPEN_AI_KEY:      z.string().min(1),
  FINANCE_API_AUTH: z.string().min(1),
  TELEGRAM_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN:       z.string().url().optional(),
  ADMIN_USER_IDS:   z.string().transform(s => new Set(s.split(','))),
})

export type Env = z.infer<typeof envSchema>

// Falha imediatamente no startup se algo estiver errado
export const env = envSchema.parse(process.env)
```

---

### 4.6 Logging Estruturado

**Problema atual:**
```javascript
console.log('erro :: ', e)    // nivel: nenhum, formato: livre
console.error('WhatsApp init', e)
```

**Proposta:**
```typescript
// src/shared/logger/Logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'prod' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'prod'
    ? { target: 'pino-pretty' }
    : undefined,
})

// Uso:
logger.error({ err, userId }, 'Falha ao processar comando')
logger.info({ command: 'adicionardivida', userId }, 'Comando executado')
```

---

### 4.7 Result Type — Sem Throws Silenciosos

```typescript
// src/domain/shared/Result.ts
export class Result<T, E extends Error = Error> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(value, undefined)
  }

  static err<E extends Error>(error: E): Result<never, E> {
    return new Result(undefined, error)
  }

  isOk(): this is Result<T, never> {
    return this._error === undefined
  }

  isErr(): this is Result<never, E> {
    return this._error !== undefined
  }

  get value(): T {
    if (!this.isOk()) throw new Error('Result is an error')
    return this._value as T
  }

  get error(): E {
    if (!this.isErr()) throw new Error('Result is ok')
    return this._error as E
  }
}
```

---

## 5. Estratégia de Migração (Fases)

A migração deve ser **incremental** — o bot continua funcionando durante todo o processo.

### Fase 1 — Fundação (Sem quebrar nada) · ~1 semana

- [ ] Instalar TypeScript, configurar `tsconfig.json` com `allowJs: true`
- [ ] Instalar `pino` (logger), `zod` (já existe), `jest` + `ts-jest`
- [ ] Criar `src/config/env.ts` com validação Zod
- [ ] Criar `src/shared/logger/Logger.ts`
- [ ] Criar `src/domain/shared/Result.ts`
- [ ] Criar `src/infrastructure/database/MongoConnection.ts` (extrai lógica de `mongodb.js`)
- [ ] **Meta:** O bot ainda funciona; base tipada disponível para novos arquivos

### Fase 2 — Domínio de Dívidas (Feature mais crítica) · ~1 semana

- [ ] Criar entidades `Debt`, `DebtUser` em `src/domain/debt/`
- [ ] Criar `IDebtRepository` + `MongoDebtRepository`
- [ ] Criar `AddDebtUseCase`, `PayDebtUseCase`, `ListDebtsUseCase`
- [ ] Criar `AddDebtCommand`, `PayDebtCommand` (tipados, com Zod)
- [ ] Escrever testes unitários para domain + use cases
- [ ] Substituir os arquivos JS correspondentes
- [ ] **Meta:** Feature de dívidas 100% em TypeScript com testes

### Fase 3 — Guards e Segurança · ~3 dias

- [ ] Criar `AdminGuard` com `AuthorizationService` baseado em Discord User ID
- [ ] Remover `guard-handler.js`
- [ ] Adicionar `RateLimitGuard` (máximo N comandos por usuário por minuto)
- [ ] Adicionar validação de inputs em todos os handlers existentes (via `BaseCommand`)
- [ ] **Meta:** Eliminação do username hardcoded; input validation universal

### Fase 4 — Restante dos Domínios · ~2 semanas

- [ ] Migrar `finance/` (DailyBudget, CaixinhaService, GastosCartao)
- [ ] Migrar `game/` (JogoBixo)
- [ ] Migrar `ai/` (ChatGPT, Watson)
- [ ] Migrar `b3/` (arbitragem)
- [ ] Migrar Telegram adapter
- [ ] **Meta:** Todos os domínios principais com testes

### Fase 5 — Scheduler e Jobs · ~3 dias

- [ ] Criar `JobScheduler` usando `node-cron` (npm package oficial)
- [ ] Migrar cada job para arquivo próprio em `src/scheduler/jobs/`
- [ ] Testes de integração para jobs críticos
- [ ] **Meta:** Remoção do scheduler customizado frágil

### Fase 6 — Limpeza Final · ~3 dias

- [ ] Remover todos os arquivos `.js` substituídos
- [ ] Remover `context.js` (God-object)
- [ ] Ativar `allowJs: false` no tsconfig
- [ ] Ativar `strict: true` completamente
- [ ] Revisar cobertura de testes (meta: 70%+ no domínio)

---

## 6. Configuração TypeScript Recomendada

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "allowJs": true,
    "checkJs": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infra/*": ["src/infrastructure/*"],
      "@discord/*": ["src/discord/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 7. Dependências a Adicionar / Remover

### Adicionar
```json
{
  "typescript": "^5.x",
  "pino": "^9.x",
  "pino-pretty": "^13.x",
  "jest": "^29.x",
  "ts-jest": "^29.x",
  "@types/node": "^22.x",
  "tsconfig-paths": "^4.x"
}
```

### Remover / Substituir
| Atual | Proposta | Motivo |
|---|---|---|
| Scheduler customizado em `src/schedules/` | `node-cron` npm | Menos código pra manter |
| `console.log/error` espalhados | `pino` centralizado | Log estruturado, níveis |
| `ibm-watson` (fallback raramente usado) | Remover ou isolar | Simplificação |

---

## 8. Estratégia de Testes

```
tests/
├── unit/
│   ├── domain/debt/DebtUser.test.ts        # Testa invariantes do domínio
│   ├── domain/finance/DailyBudget.test.ts
│   └── application/debt/AddDebtUseCase.test.ts  # Usa mocks do repositório
│
└── integration/
    ├── infrastructure/MongoDebtRepository.test.ts  # Usa MongoDB in-memory
    └── discord/AddDebtCommand.test.ts              # Testa fluxo completo
```

**Exemplo de teste unitário:**
```typescript
// tests/unit/domain/debt/DebtUser.test.ts
describe('DebtUser', () => {
  it('deve calcular o total devido corretamente', () => {
    const user = new DebtUser('user1', [
      { id: '1', value: 100, description: 'Almoço', lender: 'Jean', createdAt: new Date() },
    ], [
      { id: 'p1', value: 50, createdAt: new Date() },
    ])

    expect(user.totalOwed).toBe(50)
  })

  it('não deve aceitar valor negativo', () => {
    const user = new DebtUser('user1', [], [])
    expect(() => user.addDebt({ value: -10, description: 'X', lender: 'Y' }))
      .toThrow('Valor da dívida deve ser positivo')
  })
})
```

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Bot para de funcionar durante migração | Baixa | Migração incremental; arquivos JS coexistem com TS |
| Comportamento diferente após refatoração | Média | Testes antes de remover código antigo |
| Complexidade de DI aumentar o tempo | Média | Começar sem framework de DI (injeção manual) |
| Tipos do Discord.js complexos | Baixa | `@types/discord.js` já embutido no v13+ |

---

## 10. Resumo de Prioridades

```
🔴 CRÍTICO (fazer antes de qualquer feature nova)
   • Validação de inputs nos handlers
   • Autorização por User ID (não username)
   • Await em todas as operações de persistência

🟡 ALTO (Fase 1-3 da migração)
   • TypeScript + env.ts com Zod
   • Logger estruturado
   • Testes no domínio de dívidas (mais sensível)
   • Repository pattern estrito

🟢 MÉDIO (Fase 4-6)
   • Migrar todos os domínios
   • Rate limiting
   • Scheduler oficial
   • Cobertura de 70%+ em testes
```

---

> **Conclusão:** O bot tem uma base funcional sólida com integração rica (Discord, Telegram, WhatsApp, crypto, finanças). A refatoração proposta não muda o _que_ o bot faz, apenas _como_ — tornando o código mais seguro, testável e sustentável para crescer com novas features.
