import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('UploadRecordsCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $uprec
 * Faz upload das gravações para o Google Drive.
 */
export class UploadRecordsCommand extends BaseCommand<typeof schema> {
  readonly name = 'uprec'
  readonly description = 'Upload das gravações para o Google Drive'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly handler = require('../../../handlers/record/upload-records')

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      await this.handler(message)
    } catch (err) {
      log.error({ err }, 'Falha no upload de gravações')
      await message.reply('Erro ao fazer upload das gravações.')
    }
  }

  protected getUsage() { return '`$uprec`' }
}
