import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('UpdatePortfolioCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $acao
 * Atualiza cotações e logos dos ativos na carteira.
 */
export class UpdatePortfolioCommand extends BaseCommand<typeof schema> {
  readonly name = 'acao'
  readonly description = 'Atualiza cotações na carteira'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly handler = require('../../../handlers/b3/atualizar-cotacao-carteira')

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await this.handler(message)
    } catch (err) {
      log.error({ err }, 'Falha ao atualizar carteira')
      await message.reply('Erro ao atualizar cotações.')
    }
  }

  protected getUsage() { return '`$acao`' }
}
