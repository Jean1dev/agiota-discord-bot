import { z } from 'zod'
import { createSubscription } from '../../../services/subscription/SubscriptionService'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('CreateSubscriptionCommand')

const schema = z.tuple([
  z.string().email('E-mail inválido'),
]).rest(z.string())

/**
 * $sub <email> [telefone] (admin only)
 * Cria uma nova assinatura de 30 dias.
 */
export class CreateSubscriptionCommand extends BaseCommand<typeof schema> {
  readonly name = 'sub'
  readonly description = 'Cria uma nova assinatura :: $sub <email> [telefone]'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage, [email, ...rest]: z.infer<typeof schema>): Promise<void> {
    const fone = rest.join(' ')
    const result = await createSubscription(email, fone)
    log.info({ email }, 'Assinatura criada')
    await message.reply(`Status ${result.status} para criação do plano.`)
  }

  protected getUsage() { return '`$sub <email> [telefone]`' }
}
