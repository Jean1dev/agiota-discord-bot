import { z } from 'zod'
import { getActiveSubscriptions } from '../../../services/subscription/SubscriptionService'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('ActiveSubscriptionsCommand')
const schema = z.tuple([]).rest(z.string())

interface Subscription { email: string; expiresIn: string }
interface SubscriptionsResult { totalActive: number; expiringSoon: Subscription[] }

/**
 * $ass (admin only)
 * Lista o total e as assinaturas prestes a expirar.
 */
export class ActiveSubscriptionsCommand extends BaseCommand<typeof schema> {
  readonly name = 'ass'
  readonly description = 'Verifica as assinaturas ativas (apenas admin)'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    const data = (await getActiveSubscriptions()) as SubscriptionsResult
    log.info({ total: data.totalActive }, 'Assinaturas consultadas')
    await message.reply(`Total de assinaturas ativas: ${data.totalActive}`)
    for (const sub of data.expiringSoon) {
      await message.reply(`${sub.email} — ${sub.expiresIn}`)
    }
  }

  protected getUsage() { return '`$ass`' }
}
