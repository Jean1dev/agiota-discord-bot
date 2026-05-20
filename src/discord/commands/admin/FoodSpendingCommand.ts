import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import { getFoodSpending, updateFoodSpending } from '../../../services/finance/OrganizzeService'
import { sendEmail } from '../../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../../config/constants'

const log = createLogger('FoodSpendingCommand')
const schema = z.tuple([]).rest(z.string())

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function formatBRL(cents: number): string {
  const reais = (cents / 100).toFixed(2)
  const [intPart = '0', decPart = '00'] = reais.split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intFormatted},${decPart}`
}

export class FoodSpendingCommand extends BaseCommand<typeof schema> {
  readonly name = 'food-spending'
  readonly description = 'Atualiza o gasto mensal com alimentação e envia e-mail ao admin'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Buscando dados de gastos com alimentação...')

    const foodSpending = await getFoodSpending()
    const { total_cents, year, month, items } = foodSpending

    log.info({ total_cents, year, month, itemCount: items.length }, 'Dados de alimentação obtidos')

    await updateFoodSpending(foodSpending)

    const valorFormatado = formatBRL(total_cents)
    const nomeMes = MESES[month - 1] ?? `mês ${month}`

    const itemLines = items
      .map(i => `- ${i.description} (${i.date}): ${formatBRL(Math.abs(i.amount_cents))}`)
      .join('\n')

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Gastos com alimentação de ${nomeMes}/${year} atualizados`,
      message: `O gasto com alimentação referente a ${nomeMes}/${year} foi atualizado.\n\nTotal: ${valorFormatado}\n\nItens:\n${itemLines}`,
    })
    log.info({ to: ADMIN_EMAIL, valorFormatado, nomeMes, year }, 'E-mail de alimentação enviado')

    await message.reply(
      `Gastos com alimentação atualizados!\nPeríodo: ${nomeMes}/${year}\nTotal: ${valorFormatado}\nItens: ${items.length}\nE-mail de notificação enviado para ${ADMIN_EMAIL}.`,
    )
  }

  protected getUsage() { return '`$food-spending`' }
}
