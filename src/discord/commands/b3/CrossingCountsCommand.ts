import { z } from 'zod'
import { futureCrossingCounts } from '../../../services/b3/CryptoArbitrageService'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('CrossingCountsCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $cr-counts (admin only)
 * Executa POST /v1/arbitrage/future/crossing-counts.
 */
export class CrossingCountsCommand extends BaseCommand<typeof schema> {
  readonly name = 'cr-counts'
  readonly description = 'POST crossing-counts (apenas admin)'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      const response = await futureCrossingCounts()
      const data = response.data as unknown
      const body = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
      await message.reply(`crossing-counts:\n\`\`\`${body}\`\`\``)
    } catch (err) {
      log.error({ err }, 'Falha em crossing-counts')
      const error = err as { response?: { data?: unknown }; message?: string }
      const msg = error.response?.data ? JSON.stringify(error.response.data) : (error.message ?? 'erro desconhecido')
      await message.reply(`Erro: ${msg}`)
    }
  }

  protected getUsage() { return '`$cr-counts`' }
}
