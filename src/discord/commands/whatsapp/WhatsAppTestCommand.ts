import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([]).rest(z.string())

export class WhatsAppTestCommand extends BaseCommand<typeof schema> {
  readonly name = 'zap-test'
  readonly description = 'Envia mensagem de teste via WhatsApp — admin'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get whatsApp() { return require('../../../services/WhatsAppService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    const result: { ok: boolean; error?: string } = await this.whatsApp.sendTestMessage()
    if (result.ok) {
      await message.reply('✅ Mensagem de teste enviada no WhatsApp.')
    } else {
      await message.reply('❌ Falha no teste: ' + result.error)
    }
  }

  protected getUsage() { return '`$zap-test`' }
}
