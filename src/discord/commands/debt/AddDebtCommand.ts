import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { AddDebtUseCase } from '../../../application/debt/AddDebtUseCase'

/**
 * $add-divida <valor> <@usuario> [descrição...]
 *
 * Exemplos:
 *   $add-divida 50 <@123456789>
 *   $add-divida 150.50 <@123456789> Empréstimo para o almoço
 */
const schema = z.tuple([
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido — use números (ex: 50 ou 150.50)')
    .transform(Number),
  z
    .string()
    .min(1, 'Informe o usuário (ex: <@123456789>)'),
]).rest(z.string())

type ParsedArgs = z.infer<typeof schema>

export class AddDebtCommand extends BaseCommand<typeof schema> {
  readonly name = 'add-divida'
  readonly description = 'Adiciona uma dívida para um usuário :: $add-divida <valor> <@usuario> [descrição]'
  protected readonly schema = schema

  constructor(private readonly useCase: AddDebtUseCase) {
    super()
  }

  protected async handle(
    message: DiscordMessage,
    [value, userId, ...descParts]: ParsedArgs,
  ): Promise<void> {
    const description = descParts.join(' ')
    const result = await this.useCase.execute({
      value,
      userId,
      description,
      lender: message.author.username,
    })

    if (!result.ok) {
      await message.reply(`Erro ao adicionar dívida: ${result.error.message}`)
      return
    }

    const user = result.value
    await message.reply(
      `Dívida de R$${value.toFixed(2)} adicionada para ${userId}. Total em aberto: R$${user.totalOwed.toFixed(2)}`,
    )
  }

  protected getUsage(): string {
    return '`$add-divida <valor> <@usuario> [descrição]`'
  }
}
