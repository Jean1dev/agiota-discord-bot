import { z } from 'zod'
import { createLogger } from '../../shared/logger/Logger'
import { globalRateLimiter, RateLimitOptions } from '../guards/RateLimitGuard'

const log = createLogger('BaseCommand')

// Tipos mínimos do Discord.js v13 para não criar dependência pesada nos testes
export interface DiscordMessage {
  author: { id: string; username: string }
  channel: { send(text: string): Promise<unknown> }
  reply(text: string): Promise<unknown>
}

export interface CommandContext {
  message: DiscordMessage
  args: string[]
}

/**
 * Classe base para todos os comandos Discord tipados.
 *
 * Responsabilidades:
 * - Validar os argumentos via schema Zod antes de executar
 * - Responder com mensagem de uso incorreto se a validação falhar
 * - Registrar erros não esperados no logger
 *
 * Uso:
 *   class MeuCommand extends BaseCommand<typeof meuSchema> {
 *     readonly name = 'meu-cmd'
 *     protected readonly schema = meuSchema
 *     protected async handle(msg, data) { ... }
 *     protected getUsage() { return '`$meu-cmd <arg>`' }
 *   }
 */
export abstract class BaseCommand<TSchema extends z.ZodType> {
  abstract readonly name: string
  abstract readonly description: string
  protected abstract readonly schema: TSchema

  /**
   * Subclasses podem sobrescrever para personalizar o rate limit do comando.
   * Por padrão usa o limitador global (5 req/min).
   */
  protected readonly rateLimitOptions: RateLimitOptions | null = null

  async execute(ctx: CommandContext): Promise<void> {
    // ── Rate limiting ───────────────────────────────────────────────────
    const limiter = this.rateLimitOptions !== null
      ? new (require('../guards/RateLimitGuard').RateLimitGuard)(this.rateLimitOptions)
      : globalRateLimiter

    const { allowed, retryAfterMs } = limiter.check(ctx.message.author.id)
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      await ctx.message.reply(`Muitas requisições. Tente novamente em ${seconds}s.`)
      return
    }

    // ── Validação de schema ─────────────────────────────────────────────
    const parsed = this.schema.safeParse(ctx.args)
    if (!parsed.success) {
      const problems = parsed.error.issues.map(i => i.message).join('; ')
      await ctx.message.reply(`Uso incorreto: ${this.getUsage()}\n> ${problems}`)
      return
    }

    // ── Execução ────────────────────────────────────────────────────────
    try {
      await this.handle(ctx.message, parsed.data)
    } catch (err) {
      log.error({ err, command: this.name, userId: ctx.message.author.id }, 'Erro inesperado no command')
      await ctx.message.reply('Ocorreu um erro inesperado. Tente novamente.')
    }
  }

  protected abstract handle(message: DiscordMessage, data: z.infer<TSchema>): Promise<void>
  protected abstract getUsage(): string

  /**
   * Retorna um adaptador compatível com o sistema legado de registro de comandos.
   * Permite registrar um command TS no lista-comandos.js sem alterar o roteador existente.
   *
   * Exemplo:
   *   registrarComando('add-divida', addDebtCommand.asHandler(), '...', true)
   */
  asHandler() {
    return async (args: string[], message: DiscordMessage) =>
      this.execute({ message, args })
  }

  /** Variante para comandos sem argumentos. */
  asNoArgsHandler() {
    return async (message: DiscordMessage) =>
      this.execute({ message, args: [] })
  }
}
