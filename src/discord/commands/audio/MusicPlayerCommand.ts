import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import musicHandler from '../../../handlers/music'

const log = createLogger('MusicPlayerCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $p
 * Liga o player de música (slash commands Discord).
 */
export class MusicPlayerCommand extends BaseCommand<typeof schema> {
  readonly name = 'p'
  readonly description = 'Liga o player de música'
  protected readonly schema = schema

  private readonly handler = musicHandler

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await this.handler(message)
    } catch (err) {
      log.error({ err }, 'Falha no music player')
      await message.reply('Erro ao iniciar o player de música.')
    }
  }

  protected getUsage() { return '`$p`' }
}
