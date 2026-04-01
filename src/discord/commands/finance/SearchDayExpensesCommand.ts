import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('SearchDayExpensesCommand')

const DATE_REGEX = /^\d{1,2}\/\d{1,2}(\/\d{4})?$/

const schema = z.tuple([
  z.string()
    .regex(DATE_REGEX, 'Formato de data inválido — use DD/MM ou DD/MM/AAAA')
]).rest(z.string())

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/')
  const day = parseInt(parts[0]!, 10)
  const month = parseInt(parts[1]!, 10) - 1
  const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) throw new Error('Data inválida')
  return date
}

/**
 * $bg <DD/MM> ou $bg <DD/MM/AAAA>
 * Busca as transações de um dia específico.
 */
export class SearchDayExpensesCommand extends BaseCommand<typeof schema> {
  readonly name = 'bg'
  readonly description = 'Busca transações do dia :: $bg <DD/MM> ou $bg <DD/MM/AAAA>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly budgetService = require('../../../services/myDailyBudget')

  protected async handle(message: DiscordMessage, [dateStr]: z.infer<typeof schema>): Promise<void> {
    let date: Date
    try {
      date = parseDate(dateStr)
    } catch {
      await message.reply('Data inválida. Use o formato DD/MM ou DD/MM/AAAA.')
      return
    }

    try {
      const transactions: string[] = await this.budgetService.consultarTransacoesDoDia(date)
      if (transactions.length === 0) {
        await message.reply('Não há transações para esta data.')
        return
      }
      await message.reply(transactions.join('\n'))
    } catch (err) {
      log.error({ err, date: dateStr }, 'Falha ao buscar transações do dia')
      await message.reply('Erro ao buscar transações.')
    }
  }

  protected getUsage() { return '`$bg <DD/MM>` ou `$bg <DD/MM/AAAA>`' }
}
