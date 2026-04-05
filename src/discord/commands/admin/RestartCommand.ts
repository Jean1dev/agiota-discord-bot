import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('RestartCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $rs (admin only)
 * Reinicia a aplicação com graceful shutdown de 2s.
 */
export class RestartCommand extends BaseCommand<typeof schema> {
  readonly name = 'rs'
  readonly description = 'Reinicia a aplicação (apenas admin)'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Reiniciando a aplicação...')
    log.info('Restart solicitado via comando Discord')
    setTimeout(() => process.exit(0), 2000)
  }

  protected getUsage() { return '`$rs`' }
}
