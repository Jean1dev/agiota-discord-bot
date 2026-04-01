import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([]).rest(z.string())

/**
 * $ia
 * Liga ou desliga o modo de IA (responde a todas as mensagens sem prefixo).
 */
export class ToggleIaModeCommand extends BaseCommand<typeof schema> {
  readonly name = 'ia'
  readonly description = 'Liga ou desliga a inteligência artificial'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly context = require('../../../context').contextInstance

  protected async handle(message: DiscordMessage): Promise<void> {
    const ctx = this.context()
    ctx.isIAEnabled = !ctx.isIAEnabled
    ctx.isChatGPTEnabled = ctx.isIAEnabled

    if (ctx.isIAEnabled) {
      await message.channel.send('Inteligência Artificial ativada! 👽')
    } else {
      await message.channel.send('Inteligência Artificial desativada. 👩‍💻')
    }
  }

  protected getUsage() { return '`$ia`' }
}
