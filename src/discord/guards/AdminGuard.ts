import { AuthorizationService } from './AuthorizationService'
import { BaseCommand, CommandContext } from '../commands/BaseCommand'
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
