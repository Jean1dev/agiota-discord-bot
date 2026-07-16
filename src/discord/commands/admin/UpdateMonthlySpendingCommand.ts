import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import {
  FoodSpendingItem,
  getFoodSpending,
  getInterest,
  InterestItem,
  updateFoodSpending,
  updateInterest,
} from '../../../services/finance/OrganizzeService'
import { sendEmail } from '../../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../../config/constants'

const log = createLogger('UpdateMonthlySpendingCommand')
const schema = z.tuple([]).rest(z.string())

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

type RoutineResult = {
  ok: boolean
  message: string
}

function formatBRL(cents: number): string {
  const reais = (cents / 100).toFixed(2)
  const [intPart = '0', decPart = '00'] = reais.split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intFormatted},${decPart}`
}

function getMonthName(month: number): string {
  return MESES[month - 1] ?? `mês ${month}`
}

function formatInterestItems(items: InterestItem[]): string {
  if (items.length === 0) return 'Nenhuma transação encontrada.'

  return items.map(t => {
    const data = new Date(t.date).toLocaleDateString('pt-BR')
    const valorTotal = formatBRL(Math.abs(t.amount_cents))
    const juros = formatBRL(t.interest_cents)
    return `- ${data} | ${t.description} | Total: ${valorTotal} | Juros: ${juros}`
  }).join('\n')
}

function formatFoodItems(items: FoodSpendingItem[]): string {
  if (items.length === 0) return 'Nenhum item encontrado.'

  return items
    .map(i => `- ${i.description} (${i.date}): ${formatBRL(Math.abs(i.amount_cents))}`)
    .join('\n')
}

async function runInterestUpdate(): Promise<RoutineResult> {
  try {
    const interest = await getInterest()
    const { interest_cents, year, month, items } = interest

    log.info({ interest_cents, year, month, itemCount: items.length }, 'Dados de juros obtidos')

    await updateInterest(interest)

    const valorFormatado = formatBRL(interest_cents)
    const nomeMes = getMonthName(month)

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Juros de ${nomeMes}/${year} atualizados`,
      message: [
        `O gasto de juros referente a ${nomeMes}/${year} foi atualizado.`,
        ``,
        `Valor total de juros: ${valorFormatado}`,
        ``,
        `--- Transações (${items.length}) ---`,
        formatInterestItems(items),
      ].join('\n'),
    })
    log.info({ to: ADMIN_EMAIL, valorFormatado, nomeMes, year, transacoes: items.length }, 'E-mail de juros enviado')

    return {
      ok: true,
      message: `Juros: atualizado (${nomeMes}/${year}) - ${valorFormatado}. E-mail enviado para ${ADMIN_EMAIL}.`,
    }
  } catch (err) {
    log.error({ err }, 'Falha ao atualizar juros')
    return {
      ok: false,
      message: 'Juros: falhou ao atualizar. Detalhes nos logs.',
    }
  }
}

async function runFoodSpendingUpdate(): Promise<RoutineResult> {
  try {
    const foodSpending = await getFoodSpending()
    const { total_cents, year, month, items } = foodSpending

    log.info({ total_cents, year, month, itemCount: items.length }, 'Dados de alimentação obtidos')

    await updateFoodSpending(foodSpending)

    const valorFormatado = formatBRL(total_cents)
    const nomeMes = getMonthName(month)

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Gastos com alimentação de ${nomeMes}/${year} atualizados`,
      message: `O gasto com alimentação referente a ${nomeMes}/${year} foi atualizado.\n\nTotal: ${valorFormatado}\n\nItens:\n${formatFoodItems(items)}`,
    })
    log.info({ to: ADMIN_EMAIL, valorFormatado, nomeMes, year }, 'E-mail de alimentação enviado')

    return {
      ok: true,
      message: `Alimentação: atualizada (${nomeMes}/${year}) - ${valorFormatado}; itens: ${items.length}. E-mail enviado para ${ADMIN_EMAIL}.`,
    }
  } catch (err) {
    log.error({ err }, 'Falha ao atualizar gastos com alimentação')
    return {
      ok: false,
      message: 'Alimentação: falhou ao atualizar. Detalhes nos logs.',
    }
  }
}

export class UpdateMonthlySpendingCommand extends BaseCommand<typeof schema> {
  readonly name = 'atualizar-gastos'
  readonly description = 'Atualiza os gastos mensais de juros e alimentação e envia e-mails ao admin'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Buscando dados de juros e alimentação...')

    const results = await Promise.all([
      runInterestUpdate(),
      runFoodSpendingUpdate(),
    ])
    const successCount = results.filter(r => r.ok).length

    await message.reply([
      `Atualização de gastos finalizada (${successCount}/${results.length} rotinas concluídas).`,
      ...results.map(r => `- ${r.message}`),
    ].join('\n'))
  }

  protected getUsage() { return '`$atualizar-gastos`' }
}
