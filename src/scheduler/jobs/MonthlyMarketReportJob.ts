import { IJob } from '../IJob'
import { fetchMonthlyReport } from '../../services/finance/ComprasMercadoReportService'
import {
  gerarPdfRelatorioMensalCompras,
  mesAnoLabel,
} from '../../services/pdf/MonthlyMarketReportPdf'
import { upload } from '../../services/upload/UploadService'
import { sendEmail } from '../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../config/constants'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MonthlyMarketReportJob')

/**
 * Retorna true se `date` for o último dia do mês.
 * node-cron não suporta o coringa "L", então o job roda todo dia e este
 * guard garante que o relatório só é gerado no fechamento do mês.
 */
export function ehUltimoDiaDoMes(date: Date): boolean {
  const amanha = new Date(date)
  amanha.setDate(date.getDate() + 1)
  return amanha.getDate() === 1
}

/** Formata uma data como "YYYY-MM" (mês de referência do endpoint). */
export function formatMonth(date: Date): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

/**
 * Roda diariamente às 23:30 e, no último dia do mês, consome o endpoint
 * GET /reports/:month, monta um PDF visual, sobe para o storage e envia
 * como anexo no e-mail do admin.
 */
export class MonthlyMarketReportJob implements IJob {
  readonly cronExpression = '30 23 * * *'

  async run(): Promise<void> {
    const hoje = new Date()
    if (!ehUltimoDiaDoMes(hoje)) {
      return
    }

    const month = formatMonth(hoje)
    log.info({ month }, 'Último dia do mês — gerando relatório de compras')

    const report = await fetchMonthlyReport(month)
    if (!report) {
      log.error({ month }, 'Relatório vazio — abortando')
      return
    }

    const pdfPath = gerarPdfRelatorioMensalCompras(report, month)
    // Garante que o stream do PDF terminou de escrever antes do upload.
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
