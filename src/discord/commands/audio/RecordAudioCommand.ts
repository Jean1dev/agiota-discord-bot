import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('RecordAudioCommand')

const schema = z.tuple([
  z.string()
    .regex(/^\d+$/, 'Informe a duração em segundos (número inteiro)')
    .transform(Number)
    .optional(),
]).rest(z.string())

/**
 * $rec [segundos]
 * Grava áudio no canal de voz.
 */
export class RecordAudioCommand extends BaseCommand<typeof schema> {
  readonly name = 'rec'
  readonly description = 'Grava áudio :: $rec <segundos>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly handler = require('../../../handlers/record/record-audio')

  protected async handle(
    message: DiscordMessage,
    [seconds]: z.infer<typeof schema>
  ): Promise<void> {
    try {
      const args = seconds !== undefined ? [String(seconds)] : []
      await this.handler(args, message)
    } catch (err) {
      log.error({ err }, 'Falha na gravação de áudio')
      await message.reply('Erro ao gravar áudio.')
    }
  }

  protected getUsage() { return '`$rec <segundos>`' }
}
