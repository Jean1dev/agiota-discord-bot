import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([
  z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido — use números (ex: 500 ou 1200.50)')
    .transform(Number),
]).rest(z.string())

/**
 * $card <valor>
 * Atualiza o total gasto no cartão de crédito.
 */
export class UpdateCardExpensesCommand extends BaseCommand<typeof schema> {
  readonly name = 'card'
  readonly description = 'Atualiza os gastos do cartão de crédito :: $card <valor>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly cardService = require('../../../services/GastosCartaoService')

  protected async handle(message: DiscordMessage, [value]: z.infer<typeof schema>): Promise<void> {
    this.cardService.atualizarTotalGasto(value)
    await message.reply('Gastos do cartão atualizados.')
  }

  protected getUsage() { return '`$card <valor>`' }
}
