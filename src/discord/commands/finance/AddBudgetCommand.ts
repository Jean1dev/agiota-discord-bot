import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([
  z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido — use números (ex: 50 ou 12.50)')
    .transform(Number),
]).rest(z.string())

/**
 * $budget <valor>
 * Adiciona um valor ao orçamento diário.
 */
export class AddBudgetCommand extends BaseCommand<typeof schema> {
  readonly name = 'budget'
  readonly description = 'Adiciona um valor no orçamento diário :: $budget <valor>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly budgetService = require('../../../services/myDailyBudget')

  protected async handle(message: DiscordMessage, [value]: z.infer<typeof schema>): Promise<void> {
    const balance: number = this.budgetService.addMoneyToDailyBudget(value)
    await message.reply(`Novo saldo: R$${balance.toFixed(2)}`)
  }

  protected getUsage() { return '`$budget <valor>`' }
}
