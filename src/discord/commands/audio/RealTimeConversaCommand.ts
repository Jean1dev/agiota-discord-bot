import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('RealTimeConversaCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $conversa
 * Conversa em tempo real com o ChatGPT via áudio.
 */
export class RealTimeConversaCommand extends BaseCommand<typeof schema> {
  readonly name = 'conversa'
  readonly description = 'Conversa em tempo real com o ChatGPT via áudio'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly handler = require('../../../handlers/real-time-conversa')

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await this.handler(message)
    } catch (err) {
      log.error({ err }, 'Falha na conversa em tempo real')
      await message.reply('Erro ao iniciar conversa em tempo real.')
    }
  }

  protected getUsage() { return '`$conversa`' }
}
