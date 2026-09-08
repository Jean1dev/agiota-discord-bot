import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { GetReadingStatusUseCase } from '../../../application/reading/GetReadingStatusUseCase'
import captureException from '../../../observability/Sentry'

// Sem argumentos
const schema = z.tuple([]).rest(z.string())

/**
 * $paginas
 *
 * Mostra o débito atual de páginas de leitura.
 */
export class ReadingStatusCommand extends BaseCommand<typeof schema> {
  readonly name = 'paginas'
  readonly description = 'Mostra o débito atual de páginas de leitura'
  protected readonly schema = schema

  constructor(private readonly useCase: GetReadingStatusUseCase) {
    super()
  }

  protected async handle(message: DiscordMessage): Promise<void> {
    const result = await this.useCase.execute()

    if (!result.ok) {
      captureException(result.error)
      await message.reply(`Erro ao buscar débito de leitura: ${result.error.message}`)
      return
    }

    const debt = result.value.pagesDebt

    if (debt <= 0) {
      const credit = -debt
      const suffix = credit > 0 ? ` (${credit} página(s) de crédito)` : ''
      await message.reply(`Débito de leitura em dia!${suffix}`)
    } else {
      await message.reply(`Débito atual de leitura: ${debt} página(s)`)
    }
  }

  protected getUsage(): string {
    return '`$paginas`'
  }
}
