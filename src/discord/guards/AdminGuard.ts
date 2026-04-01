import { AuthorizationService } from './AuthorizationService'
import { BaseCommand, CommandContext, DiscordMessage } from '../commands/BaseCommand'
import { createLogger } from '../../shared/logger/Logger'
import { z } from 'zod'

const log = createLogger('AdminGuard')

/**
 * Guard que restringe a execução de um BaseCommand a usuários admin.
 *
 * Uso:
 *   const guardedCommand = adminGuard.protect(new MyCommand(...))
 *   // guardedCommand pode ser registrado no roteador normalmente
 */
export class AdminGuard {
  constructor(private readonly auth: AuthorizationService) {}

  protect<TSchema extends z.ZodType>(
    command: BaseCommand<TSchema>,
  ): BaseCommand<TSchema> {
    const originalExecute = command.execute.bind(command)

    command.execute = async (ctx: CommandContext): Promise<void> => {
      const userId = ctx.message.author.id
      const allowed = await this.auth.isAdmin(userId)

      if (!allowed) {
        log.warn({ userId, command: command.name }, 'Acesso negado a comando admin')
        await ctx.message.reply('Você não tem permissão para executar esse comando.')
        return
      }

      await originalExecute(ctx)
    }

    return command
  }
}

/**
 * Versão standalone para uso em handlers JS legados que ainda não são BaseCommand.
 * Mantém a mesma semântica do `requireAdmin` antigo mas usa User ID.
 *
 * Exemplo (em JS):
 *   const { requireAdminById } = require('./guards/AdminGuard')
 *   module.exports = message => requireAdminById(message, handle)
 */
export async function requireAdminById(
  message: DiscordMessage,
  next: (message: DiscordMessage) => unknown,
): Promise<void>
export async function requireAdminById(
  args: string[],
  message: DiscordMessage,
  next: (args: string[], message: DiscordMessage) => unknown,
): Promise<void>
export async function requireAdminById(
  argsOrMessage: string[] | DiscordMessage,
  messageOrNext: DiscordMessage | ((message: DiscordMessage) => unknown),
  next?: (args: string[], message: DiscordMessage) => unknown,
): Promise<void> {
  let message: DiscordMessage
  let args: string[] | undefined

  if (Array.isArray(argsOrMessage)) {
    args = argsOrMessage
    message = messageOrNext as DiscordMessage
  } else {
    message = argsOrMessage as DiscordMessage
  }

  const adminIds = process.env['ADMIN_DISCORD_USER_IDS'] ?? ''
  const adminSet = new Set(adminIds.split(',').map(id => id.trim()).filter(Boolean))

  if (!adminSet.has(message.author.id)) {
    log.warn({ userId: message.author.id }, 'Acesso negado (requireAdminById)')
    await (message as { reply: (s: string) => Promise<unknown> }).reply(
      'Você não tem permissão para executar esse comando.',
    )
    return
  }

  if (args !== undefined && next !== undefined) {
    await next(args, message)
  } else {
    await (messageOrNext as (message: DiscordMessage) => unknown)(message)
  }
}
