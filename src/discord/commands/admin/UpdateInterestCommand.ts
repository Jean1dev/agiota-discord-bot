import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import { getInterest, updateInterest, getTransactions, TransactionItem } from '../../../services/finance/OrganizzeService'
import { sendEmail } from '../../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../../config/constants'

const log = createLogger('UpdateInterestCommand')
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

function formatTransactionsTable(transactions: TransactionItem[]): string {
  if (transactions.length === 0) return 'Nenhuma transação encontrada.'

  const lines = transactions.map(t => {
    const valor = formatBRL(t.amount_cents)
    const data = t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'
    return `- ${data} | ${t.description} | ${valor}`
  })

  return lines.join('\n')
}

/**
 * $atualizar-juros (admin only)
 * Busca os juros do mês via GET /interest, atualiza via POST /interest
 * e envia e-mail ao admin com o valor gasto em reais.
 */
export class UpdateInterestCommand extends BaseCommand<typeof schema> {
  readonly name = 'atualizar-juros'
  readonly description = 'Atualiza o gasto mensal de juros e envia e-mail ao admin'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Buscando dados de juros...')

    const [interest, transactions] = await Promise.all([getInterest(), getTransactions()])
    const { interest_cents, year, month } = interest

    log.info({ interest_cents, year, month }, 'Dados de juros obtidos')
    log.info({ count: transactions.length }, 'Transações obtidas')

    await updateInterest(interest)

    const valorFormatado = formatBRL(interest_cents)
    const nomeMes = MESES[month - 1] ?? `mês ${month}`
    const tabelaTransacoes = formatTransactionsTable(transactions)

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Juros de ${nomeMes}/${year} atualizados`,
      body: [
        `O gasto de juros referente a ${nomeMes}/${year} foi atualizado.`,
        ``,
        `Valor: ${valorFormatado}`,
        ``,
        `--- Transações do período (${transactions.length}) ---`,
        tabelaTransacoes,
      ].join('\n'),
    })
    log.info({ to: ADMIN_EMAIL, valorFormatado, nomeMes, year, transacoes: transactions.length }, 'E-mail de juros enviado')

    await message.reply(
      `Juros atualizados com sucesso!\nPeríodo: ${nomeMes}/${year}\nValor: ${valorFormatado}\nE-mail de notificação enviado para ${ADMIN_EMAIL}.`,
    )
  }

  protected getUsage() { return '`$atualizar-juros`' }
}
