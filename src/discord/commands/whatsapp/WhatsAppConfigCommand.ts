import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('WhatsAppConfigCommand')
const schema = z.tuple([]).rest(z.string())

export class WhatsAppConfigCommand extends BaseCommand<typeof schema> {
  readonly name = 'zap-config'
  readonly description = 'Inicia vinculação do WhatsApp (QR code) — admin'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get whatsApp() { return require('../../../services/WhatsAppService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await message.reply('Iniciando configuração do WhatsApp...')
      await this.whatsApp.startPairing((message as any).channel)
    } catch (e: any) {
      log.error({ err: e }, 'Erro ao configurar WhatsApp')
      await message.reply('Erro ao configurar WhatsApp: ' + (e.message || String(e)))
    }
  }

  protected getUsage() { return '`$zap-config`' }
}
