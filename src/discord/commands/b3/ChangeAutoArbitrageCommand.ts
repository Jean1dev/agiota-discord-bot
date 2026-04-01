import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { contextInstance } from '../../../context'

const schema = z.tuple([]).rest(z.string())

/**
 * $auto-arb (admin only)
 * Alterna o estado da auto-arbitragem.
 */
export class ChangeAutoArbitrageCommand extends BaseCommand<typeof schema> {
  readonly name = 'auto-arb'
  readonly description = 'Alterna o estado da auto-arbitragem (apenas admin)'
  protected readonly schema = schema

  private readonly context = contextInstance

  protected async handle(message: DiscordMessage): Promise<void> {
    const ctx = this.context()
    ctx.changeAutoArbitragem()
    const status = ctx.autoArbitragem ? 'ativada' : 'desativada'
    await message.reply(`Auto-arbitragem ${status} com sucesso!`)
  }

  protected getUsage() { return '`$auto-arb`' }
}
