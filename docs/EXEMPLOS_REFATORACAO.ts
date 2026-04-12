/**
 * EXEMPLOS PRÁTICOS DE REFATORAÇÃO
 *
 * Este arquivo demonstra side-by-side os padrões propostos.
 * Não é código de produção — é material de referência para a migração.
 */

// ============================================================
// SEÇÃO 1: ENTIDADE DE DOMÍNIO (imutável, testável, sem deps)
// ============================================================

// ─── ANTES (adicionar-divida.js) ───────────────────────────
/*
function umaDivida(valorDivida, descricao, quemEmprestouDinheiro) {
  return {
    data: new Date(),
    valor: valorDivida,   // string ou number? ninguém sabe
    descricao,
    quemEmprestouDinheiro
  }
}

module.exports = async (args, message) => {
  const valorDivida = args[0]   // sem validação
  const userId = args[1]        // pode ser undefined
  const descricao = args.splice(2, args.length).join(' ')  // mutação dos args!
  context().dividas.push(...)
  context().save()  // fire-and-forget
}
*/

// ─── DEPOIS ─────────────────────────────────────────────────

// src/domain/debt/Debt.ts
interface DebtProps {
  readonly id: string
  readonly value: number        // sempre number, nunca string
  readonly description: string
  readonly lender: string
  readonly createdAt: Date
}

class Debt {
  readonly id: string
  readonly value: number
  readonly description: string
  readonly lender: string
  readonly createdAt: Date

  private constructor(props: DebtProps) {
    this.id = props.id
    this.value = props.value
    this.description = props.description
    this.lender = props.lender
    this.createdAt = props.createdAt
  }

  static create(
    value: number,
    description: string,
    lender: string,
  ): Debt {
    if (value <= 0) throw new Error('Valor da dívida deve ser positivo')
    if (!lender.trim()) throw new Error('Credor é obrigatório')

    return new Debt({
      id: crypto.randomUUID(),
      value,
      description: description.trim(),
      lender: lender.trim(),
      createdAt: new Date(),
    })
  }
}

// src/domain/debt/DebtUser.ts
interface Payment {
  readonly id: string
  readonly value: number
  readonly createdAt: Date
}

class DebtUser {
  constructor(
    readonly userId: string,
    private readonly debts: ReadonlyArray<Debt>,
    private readonly payments: ReadonlyArray<Payment>,
  ) {}

  addDebt(value: number, description: string, lender: string): DebtUser {
    const debt = Debt.create(value, description, lender)
    return new DebtUser(this.userId, [...this.debts, debt], this.payments)
    //                                 ↑ imutável — retorna nova instância
  }

  recordPayment(value: number): DebtUser {
    if (value > this.totalOwed) throw new Error('Pagamento excede o saldo devedor')
    const payment: Payment = { id: crypto.randomUUID(), value, createdAt: new Date() }
    return new DebtUser(this.userId, this.debts, [...this.payments, payment])
  }

  get totalOwed(): number {
    const totalDebts = this.debts.reduce((sum, d) => sum + d.value, 0)
    const totalPaid = this.payments.reduce((sum, p) => sum + p.value, 0)
    return totalDebts - totalPaid
  }

  get pendingDebts(): ReadonlyArray<Debt> {
    return [...this.debts]
  }
}

// ============================================================
// SEÇÃO 2: REPOSITORY INTERFACE + IMPLEMENTAÇÃO
// ============================================================

// src/domain/debt/IDebtRepository.ts
interface IDebtRepository {
  findByUserId(userId: string): Promise<DebtUser | null>
  save(debtUser: DebtUser): Promise<void>
  findAll(): Promise<DebtUser[]>
}

// src/infrastructure/database/MongoDebtRepository.ts
// (implementação real conectaria ao MongoDB)
class InMemoryDebtRepository implements IDebtRepository {
  private readonly store = new Map<string, DebtUser>()

  async findByUserId(userId: string): Promise<DebtUser | null> {
    return this.store.get(userId) ?? null
  }

  async save(debtUser: DebtUser): Promise<void> {
    this.store.set(debtUser.userId, debtUser)
  }

  async findAll(): Promise<DebtUser[]> {
    return Array.from(this.store.values())
  }
}

// ============================================================
// SEÇÃO 3: USE CASE (orquestra domínio + repositório)
// ============================================================

// src/domain/shared/Result.ts
type ResultOk<T> = { ok: true; value: T }
type ResultErr<E> = { ok: false; error: E }
type Result<T, E = Error> = ResultOk<T> | ResultErr<E>

const Result = {
  ok: <T>(value: T): ResultOk<T> => ({ ok: true, value }),
  err: <E>(error: E): ResultErr<E> => ({ ok: false, error }),
}

// src/application/debt/AddDebtUseCase.ts
interface AddDebtDto {
  userId: string
  value: number
  description: string
  lender: string
}

class AddDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(dto: AddDebtDto): Promise<Result<DebtUser, Error>> {
    try {
      const existing = await this.debtRepo.findByUserId(dto.userId)
      const user = existing ?? new DebtUser(dto.userId, [], [])
      const updated = user.addDebt(dto.value, dto.description, dto.lender)

      await this.debtRepo.save(updated)  // ← sempre awaited

      return Result.ok(updated)
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)))
    }
  }
}

// ============================================================
// SEÇÃO 4: COMMAND DISCORD (presentation layer)
// ============================================================

// Simula tipos do Discord.js para o exemplo
interface Message {
  author: { username: string; id: string }
  reply(text: string): Promise<void>
}

// src/discord/commands/BaseCommand.ts
import { z } from 'zod'

interface CommandContext {
  message: Message
  args: string[]
}

abstract class BaseCommand<TSchema extends z.ZodType> {
  abstract readonly name: string
  protected abstract readonly schema: TSchema

  async execute(ctx: CommandContext): Promise<void> {
    const parsed = this.schema.safeParse(ctx.args)
    if (!parsed.success) {
      await ctx.message.reply(`Uso incorreto: ${this.getUsage()}\n${parsed.error.message}`)
      return
    }
    await this.handle(ctx.message, parsed.data)
  }

  protected abstract handle(message: Message, data: z.infer<TSchema>): Promise<void>
  protected abstract getUsage(): string
}

// src/discord/commands/debt/AddDebtCommand.ts
const addDebtSchema = z.tuple([
  z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor deve ser um número (ex: 50 ou 50.00)')
    .transform(Number),
  z.string().min(1, 'ID do usuário é obrigatório'),
]).rest(z.string())

class AddDebtCommand extends BaseCommand<typeof addDebtSchema> {
  readonly name = 'adicionardivida'
  protected readonly schema = addDebtSchema

  constructor(private readonly addDebtUseCase: AddDebtUseCase) {
    super()
  }

  protected async handle(
    message: Message,
    [value, userId, ...descParts]: z.infer<typeof addDebtSchema>,
  ): Promise<void> {
    const result = await this.addDebtUseCase.execute({
      value,
      userId,
      description: descParts.join(' '),
      lender: message.author.username,
    })

    if (!result.ok) {
      await message.reply(`Erro: ${result.error.message}`)
      return
    }

    await message.reply(
      `Dívida de R$${value.toFixed(2)} adicionada. Total devido: R$${result.value.totalOwed.toFixed(2)}`
    )
  }

  protected getUsage(): string {
    return '`$adicionardivida <valor> <userId> [descrição]`'
  }
}

// ============================================================
// SEÇÃO 5: GUARD POR USER ID (não por username)
// ============================================================

// ─── ANTES (guard-handler.js) ───────────────────────────────
/*
const JEANLUCAFP_NICK = 'JEANLUCAFP_NICK'  // username muda!

function requireAdmin(discordMessage, nextFunction) {
  if (discordMessage.author.username !== JEANLUCAFP_NICK) {
    discordMessage.reply("Você não tem permissão")
    return
  }
  nextFunction(discordMessage)
}
*/

// ─── DEPOIS ─────────────────────────────────────────────────

// src/discord/guards/AdminGuard.ts
interface AuthorizationService {
  isAdmin(userId: string): Promise<boolean>
}

class ConfigAuthorizationService implements AuthorizationService {
  private readonly adminIds: Set<string>

  constructor(adminUserIds: string) {
    // Configurado via env: ADMIN_USER_IDS=123456789,987654321
    this.adminIds = new Set(adminUserIds.split(',').map(id => id.trim()))
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.adminIds.has(userId)  // Discord User ID é imutável
  }
}

class AdminGuard {
  constructor(private readonly auth: AuthorizationService) {}

  protect(command: BaseCommand<z.ZodType>): BaseCommand<z.ZodType> {
    const original = command.execute.bind(command)
    command.execute = async (ctx: CommandContext) => {
      const allowed = await this.auth.isAdmin(ctx.message.author.id)
      if (!allowed) {
        await ctx.message.reply('Você não tem permissão para executar esse comando.')
        return
      }
      await original(ctx)
    }
    return command
  }
}

// ============================================================
// SEÇÃO 6: VALIDAÇÃO DE AMBIENTE
// ============================================================

// ─── ANTES (config.js) ──────────────────────────────────────
/*
module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,  // pode ser undefined — descobre na hora errada
  MONGO_URL: process.env.MONGO_URL,
}
*/

// ─── DEPOIS (src/config/env.ts) ─────────────────────────────

// import { z } from 'zod'

const envSchema = z.object({
  BOT_TOKEN:        z.string().min(1, 'BOT_TOKEN é obrigatório'),
  MONGO_URL:        z.string().url('MONGO_URL deve ser uma URL válida'),
  NODE_ENV:         z.enum(['dev', 'test', 'production']).default('dev'),
  OPEN_AI_KEY:      z.string().min(1, 'OPEN_AI_KEY é obrigatório'),
  FINANCE_API_AUTH: z.string().min(1, 'FINANCE_API_AUTH é obrigatório'),
  ADMIN_USER_IDS:   z.string().min(1, 'ADMIN_USER_IDS é obrigatório'),
  TELEGRAM_API_KEY: z.string().optional(),
  SENTRY_DSN:       z.string().url().optional(),
})

type Env = z.infer<typeof envSchema>

// Falha imediatamente no startup — fail fast
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Configuração de ambiente inválida:')
    result.error.errors.forEach(e => console.error(`  ${e.path.join('.')}: ${e.message}`))
    process.exit(1)
  }
  return result.data
}

export const env = loadEnv()

// ============================================================
// SEÇÃO 7: LOGGER ESTRUTURADO
// ============================================================

// ─── ANTES ──────────────────────────────────────────────────
/*
console.log('erro :: ', e)
console.log('Bulk deleted', messages.size, 'messages', new Date())
console.log('nao consegui enviar mensagem ::', channel)
*/

// ─── DEPOIS (src/shared/logger/Logger.ts) ───────────────────

// import pino from 'pino'
//
// export const logger = pino({
//   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   transport: process.env.NODE_ENV !== 'production'
//     ? { target: 'pino-pretty' }
//     : undefined,
// })

// Uso nos handlers:
// logger.error({ err, userId: message.author.id }, 'Falha ao processar adicionardivida')
// logger.info({ count: messages.size, channel: channelName }, 'Bulk delete concluído')
// logger.warn({ channel }, 'Canal não encontrado para envio de mensagem')

// ============================================================
// SEÇÃO 8: COMPOSITION ROOT (bootstrap/container.ts)
// ============================================================

// src/bootstrap/container.ts
function buildContainer() {
  // Infra
  const db = new InMemoryDebtRepository()
  // const db = new MongoDebtRepository(mongoClient)  // produção

  // Auth
  const authService = new ConfigAuthorizationService(
    process.env.ADMIN_USER_IDS ?? ''
  )
  const adminGuard = new AdminGuard(authService)

  // Use cases
  const addDebtUseCase = new AddDebtUseCase(db)

  // Commands
  const addDebtCommand = adminGuard.protect(new AddDebtCommand(addDebtUseCase))

  return {
    commands: new Map([
      [addDebtCommand.name, addDebtCommand],
      // ... outros comandos
    ]),
  }
}

// src/discord/CommandRouter.ts
class CommandRouter {
  constructor(
    private readonly commands: Map<string, BaseCommand<z.ZodType>>
  ) {}

  async dispatch(name: string, ctx: CommandContext): Promise<void> {
    const command = this.commands.get(name)
    if (!command) {
      await ctx.message.reply(`Comando \`${name}\` não encontrado.`)
      return
    }
    await command.execute(ctx)
  }
}

// ============================================================
// SEÇÃO 9: TESTE UNITÁRIO DE EXEMPLO
// ============================================================

// tests/unit/domain/debt/DebtUser.test.ts
describe('DebtUser', () => {
  describe('addDebt', () => {
    it('calcula o total devido corretamente', () => {
      const user = new DebtUser('user1', [], [])
      const updated = user
        .addDebt(100, 'Almoço', 'Jean')
        .addDebt(50, 'Uber', 'Jean')

      expect(updated.totalOwed).toBe(150)
    })

    it('retorna nova instância sem mutar a original', () => {
      const user = new DebtUser('user1', [], [])
      const updated = user.addDebt(100, 'Teste', 'Jean')

      expect(user.totalOwed).toBe(0)     // original não foi alterado
      expect(updated.totalOwed).toBe(100)
    })

    it('lança erro para valor negativo', () => {
      const user = new DebtUser('user1', [], [])
      expect(() => user.addDebt(-10, 'Teste', 'Jean')).toThrow(
        'Valor da dívida deve ser positivo'
      )
    })
  })

  describe('recordPayment', () => {
    it('reduz o total devido', () => {
      const user = new DebtUser('user1', [], [])
      const withDebt = user.addDebt(100, 'Teste', 'Jean')
      const afterPayment = withDebt.recordPayment(60)

      expect(afterPayment.totalOwed).toBe(40)
    })

    it('lança erro se pagamento excede a dívida', () => {
      const user = new DebtUser('user1', [], [])
      const withDebt = user.addDebt(50, 'Teste', 'Jean')

      expect(() => withDebt.recordPayment(100)).toThrow(
        'Pagamento excede o saldo devedor'
      )
    })
  })
})

describe('AddDebtUseCase', () => {
  it('persiste a dívida e retorna o usuário atualizado', async () => {
    const repo = new InMemoryDebtRepository()
    const useCase = new AddDebtUseCase(repo)

    const result = await useCase.execute({
      userId: 'user1',
      value: 75,
      description: 'Pizza',
      lender: 'Jean',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalOwed).toBe(75)
    }

    // Verifica que foi realmente persistido
    const saved = await repo.findByUserId('user1')
    expect(saved?.totalOwed).toBe(75)
  })

  it('retorna erro para valor inválido', async () => {
    const repo = new InMemoryDebtRepository()
    const useCase = new AddDebtUseCase(repo)

    const result = await useCase.execute({
      userId: 'user1',
      value: -10,
      description: 'Teste',
      lender: 'Jean',
    })

    expect(result.ok).toBe(false)
  })
})
