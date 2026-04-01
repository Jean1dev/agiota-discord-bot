import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('GameStatsCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $bixo-data
 * Exibe as estatísticas do jogo do bixo.
 */
export class GameStatsCommand extends BaseCommand<typeof schema> {
  readonly name = 'bixo-data'
  readonly description = 'Exibe as estatísticas do jogo do bixo'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly statsHandler = require('../../../handlers/jogo-bixo/estatisticas')

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      // O handler legado usa callback — mantemos compatibilidade
      await this.statsHandler(message)
    } catch (err) {
      log.error({ err }, 'Falha ao gerar estatísticas do jogo')
      await message.reply('Erro ao buscar estatísticas.')
    }
  }

  protected getUsage() { return '`$bixo-data`' }
}
