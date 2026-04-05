import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('WhatsAppClearCommand')
const schema = z.tuple([]).rest(z.string())

export class WhatsAppClearCommand extends BaseCommand<typeof schema> {
  readonly name = 'zap-clear'
  readonly description = 'Remove sessão do WhatsApp — admin'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get whatsApp() { return require('../../../services/WhatsAppService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await this.whatsApp.clearAndDisconnect()
      await message.reply('Sessão do WhatsApp removida. Use `$zap-config` para vincular novamente.')
    } catch (e: any) {
      log.error({ err: e }, 'Erro ao limpar sessão WhatsApp')
      await message.reply('Erro ao limpar sessão: ' + (e.message || String(e)))
    }
  }

  protected getUsage() { return '`$zap-clear`' }
}
