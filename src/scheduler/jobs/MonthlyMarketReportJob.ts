import { IJob } from '../IJob'
import { fetchMonthlyReport } from '../../services/finance/ComprasMercadoReportService'
import {
  gerarPdfRelatorioMensalCompras,
  mesAnoLabel,
} from '../../services/pdf/MonthlyMarketReportPdf'
import {
  getMonthlySummary,
} from '../../services/finance/OrganizzeService'
import { upload } from '../../services/upload/UploadService'
import { sendEmail } from '../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../config/constants'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MonthlyMarketReportJob')

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function ehUltimoDiaDoMes(date: Date): boolean {
  const amanha = new Date(date)
  amanha.setDate(date.getDate() + 1)
  return amanha.getDate() === 1
}

export function formatMonth(date: Date): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export class MonthlyMarketReportJob implements IJob {
  readonly cronExpression = '30 23 * * *'

  async run(): Promise<void> {
    const hoje = new Date()
    if (!ehUltimoDiaDoMes(hoje)) {
      return
    }

    const month = formatMonth(hoje)
    log.info({ month }, 'Último dia do mês — fechamento mensal')

    await this.syncOrganizzeMonthlySummary(hoje)
    await this.sendMarketReport(month)
  }

  private async syncOrganizzeMonthlySummary(hoje: Date): Promise<void> {
    const year = hoje.getFullYear()
    const month = hoje.getMonth() + 1

    const { data } = await getMonthlySummary(year, month)
    const entry = data.find(e => e.year === year && e.month === month)

    const nomeMes = MESES[month - 1] ?? `mês ${month}`
    const juros = formatBRLFromCents(entry?.interest_cents ?? null)
    const comida = formatBRLFromCents(entry?.food_spending_cents ?? null)

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Resumo financeiro — ${nomeMes}/${year}`,
      message: [
        `Fechamento mensal de ${nomeMes}/${year}.`,
        ``,
        `Juros: ${juros}`,
        `Gastos com alimentação: ${comida}`,
      ].join('\n'),
    })

    log.info({ to: ADMIN_EMAIL, year, month }, 'E-mail do resumo mensal enviado')
  }

  private async sendMarketReport(month: string): Promise<void> {
    log.info({ month }, 'Gerando relatório de compras')

    const report = await fetchMonthlyReport(month)
    if (!report) {
      log.error({ month }, 'Relatório vazio — abortando')
      return
    }

    const pdfPath = gerarPdfRelatorioMensalCompras(report, month)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const attachmentLink = await upload(pdfPath)
    if (!attachmentLink) {
      log.error({ month }, 'Upload do PDF falhou — e-mail não enviado')
      return
    }

    const ref = mesAnoLabel(month)
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Relatório de compras de mercado — ${ref}`,
      message: [
        `Segue em anexo o relatório de compras de mercado de ${ref}.`,
        ``,
        `Total gasto: ${formatBRL(report.totalSpent)}`,
        `Compras: ${report.purchaseCount}`,
        `Ticket médio: ${formatBRL(report.averageTicket)}`,
        `Itens comprados: ${report.itemCount}`,
      ].join('\n'),
      attachmentLink,
    })

    log.info({ month, to: ADMIN_EMAIL }, 'E-mail do relatório mensal enviado')
  }
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

function formatBRLFromCents(cents: number | null): string {
  if (cents === null) return '—'
  return formatBRL(cents / 100)
}
