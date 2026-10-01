import { IJob } from '../IJob'
import { myDailyBudgetService } from '../../services'
import { fetchUsageReport, formatInt, formatUsd } from '../../services/llm/LlmUsageReportService'
import { gerarPdfUsoLlm, nomeArquivoRelatorioLlm, diaMesLabel } from '../../services/pdf/LlmUsageReportPdf'
import { upload } from '../../services/upload/UploadService'
import { sendEmail } from '../../services/email/EmailService'
import { ADMIN_EMAIL } from '../../config/constants'
import captureException from '../../observability/Sentry'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('WeekendReportJob')

/** Janela do relatório de uso do LiteLLM (últimos 7 dias, UTC). */
const LLM_USAGE_DAYS = 7

/**
 * Runs every Monday at 11:15.
 * Generates the expense report for the previous weekend and the
 * LiteLLM usage dashboard (PDF) for the last 7 days.
 */
export class WeekendReportJob implements IJob {
  readonly cronExpression = '15 11 * * 1'

  async run(): Promise<void> {
    try {
      await myDailyBudgetService.gerarReportDosGastosDoUltimoFinalDeSemana()
    } catch (err) {
      log.error({ err }, 'Falha no relatório de gastos do final de semana — seguindo para uso do LiteLLM')
      captureException(err, true)
    }

    try {
      await this.sendLlmUsageReport()
    } catch (err) {
      log.error({ err }, 'Falha no relatório de uso do LiteLLM')
      captureException(err, true)
    }
  }

  private async sendLlmUsageReport(): Promise<void> {
    const report = await fetchUsageReport(LLM_USAGE_DAYS)
    const periodo = `${diaMesLabel(report.startDate)} a ${diaMesLabel(report.endDate)}`
    log.info({ startDate: report.startDate, endDate: report.endDate, isEmpty: report.isEmpty }, 'Gerando PDF de uso do LiteLLM')

    const pdfPath = gerarPdfUsoLlm(report)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const attachmentLink = await upload(pdfPath)
    if (!attachmentLink) {
      const err = new Error(`Upload do PDF de uso do LiteLLM falhou (${periodo})`)
      log.error({ periodo }, 'Upload do PDF falhou — e-mail não enviado')
      captureException(err, true)
      return
    }

    const t = report.totals
    const topModel = report.models[0]
    const resumo = report.isEmpty
      ? ['Nenhum uso registrado no período.']
      : [
          `Gasto total: ${formatUsd(t.spend)}`,
          `Requisições: ${formatInt(t.api_requests)} (${formatInt(t.failed_requests)} falhas)`,
          `Tokens: ${formatInt(t.total_tokens)}`,
          ...(topModel ? [`Modelo mais caro: ${topModel.name} (${formatUsd(topModel.metrics.spend)})`] : []),
        ]

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Uso do LiteLLM — ${periodo}`,
      message: [`Segue em anexo o dashboard de uso do LiteLLM de ${periodo} (UTC).`, '', ...resumo].join('\n'),
      attachmentLink,
      attachmentName: nomeArquivoRelatorioLlm(report),
    })

    log.info({ periodo, to: ADMIN_EMAIL }, 'E-mail de uso do LiteLLM enviado')
  }
}
