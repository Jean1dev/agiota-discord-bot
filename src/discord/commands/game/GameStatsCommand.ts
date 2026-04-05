import type { Message } from 'discord.js'
import { z } from 'zod'
import estatisticas from '../../../handlers/jogo-bixo/estatisticas'
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

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await estatisticas(message as unknown as Message)
    } catch (err) {
      log.error({ err }, 'Falha ao gerar estatísticas do jogo')
      await message.reply('Erro ao buscar estatísticas.')
    }
  }

  protected getUsage() { return '`$bixo-data`' }
}
