import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { RegisterPagesReadUseCase } from '../../../application/reading/RegisterPagesReadUseCase'

/**
 * $li <paginas>
 *
 * Registra as páginas lidas hoje, abatendo do débito de leitura.
 *
 * Exemplos:
 *   $li 10
 *   $li 25
 */
const schema = z.tuple([
  z
    .string()
    .regex(/^\d+$/, 'Quantidade inválida — use um número inteiro de páginas (ex: 10)')
    .transform(Number),
]).rest(z.string())

type ParsedArgs = z.infer<typeof schema>

export class RegisterPagesReadCommand extends BaseCommand<typeof schema> {
  readonly name = 'li'
  readonly description = 'Registra páginas lidas hoje, abatendo do débito :: $li <paginas>'
  protected readonly schema = schema

  constructor(private readonly useCase: RegisterPagesReadUseCase) {
    super()
  }

  protected async handle(message: DiscordMessage, [pages]: ParsedArgs): Promise<void> {
    const result = await this.useCase.execute({ pages })

    if (!result.ok) {
      await message.reply(`Erro ao registrar leitura: ${result.error.message}`)
      return
    }

    const debt = result.value.pagesDebt

    if (debt <= 0) {
      const credit = -debt
      const suffix = credit > 0 ? ` Você está ${credit} página(s) à frente da meta!` : ''
      await message.reply(`${pages} página(s) registrada(s). Débito em dia!${suffix}`)
    } else {
      await message.reply(`${pages} página(s) registrada(s). Débito atual: ${debt} página(s)`)
    }
  }

  protected getUsage(): string {
    return '`$li <paginas>`'
  }
}
