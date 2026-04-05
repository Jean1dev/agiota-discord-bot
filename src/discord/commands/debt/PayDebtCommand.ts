import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { PayDebtUseCase } from '../../../application/debt/PayDebtUseCase'

/**
 * $pagar <valor>
 *
 * O usuário que executa o comando registra um pagamento em seu próprio nome.
 * O Discord mention do autor (<@id>) é usado como chave de busca.
 *
 * Exemplos:
 *   $pagar 50
 *   $pagar 30.75
 */
const schema = z.tuple([
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido — use números (ex: 50 ou 30.75)')
    .transform(Number),
]).rest(z.string())

type ParsedArgs = z.infer<typeof schema>

export class PayDebtCommand extends BaseCommand<typeof schema> {
  readonly name = 'pagar'
  readonly description = 'Registra um pagamento na sua dívida :: $pagar <valor>'
  protected readonly schema = schema

  constructor(private readonly useCase: PayDebtUseCase) {
    super()
  }

  protected async handle(
    message: DiscordMessage,
    [value]: ParsedArgs,
  ): Promise<void> {
    // O ID é armazenado no formato de menção para compatibilidade com dados legados
    const userId = `<@${message.author.id}>`

    const result = await this.useCase.execute({ userId, value })

    if (!result.ok) {
      await message.reply(`Erro ao registrar pagamento: ${result.error.message}`)
      return
    }

    const user = result.value
    const remaining = user.totalOwed

    if (remaining <= 0) {
      await message.reply(`Pagamento de R$${value.toFixed(2)} registrado. Dívida quitada!`)
    } else {
      await message.reply(
        `Pagamento de R$${value.toFixed(2)} registrado. Saldo restante: R$${remaining.toFixed(2)}`,
      )
    }
  }

  protected getUsage(): string {
    return '`$pagar <valor>`'
  }
}
