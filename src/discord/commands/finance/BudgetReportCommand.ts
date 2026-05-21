import { z } from 'zod'
import { gerarRelatorioFechamentoCompentencia } from '../../../services/finance/DailyBudgetService'
import { sendEmail } from '../../../services/email/EmailService'
import { criarPDFRetornarCaminho } from '../../../services/pdf/PdfService'
import { upload } from '../../../services/upload/UploadService'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'
import { ADMIN_EMAIL } from '../../../config/constants'

const log = createLogger('BudgetReportCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $relatorio
 * Gera o relatório mensal de gastos e envia por e-mail.
 */
export class BudgetReportCommand extends BaseCommand<typeof schema> {
  readonly name = 'relatorio'
  readonly description = 'Gera o relatório mensal de gastos'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      const result: string[] = await gerarRelatorioFechamentoCompentencia()

      if (!result || result.length === 0) {
        await message.reply('Não há dados para o relatório mensal.')
        return
      }

      // Exibe as 3 últimas competências via DM
      const last3 = result.slice(-3)
      for (const item of last3) {
        await message.author.send(item)
      }

      // Gera e envia PDF por e-mail em background (não bloqueia a resposta)
      this.generateAndSendPdf(result).catch(err =>
        log.error({ err }, 'Falha ao gerar/enviar PDF do relatório')
      )
    } catch (err) {
      log.error({ err }, 'Falha ao gerar relatório')
      await message.reply('Erro ao gerar o relatório.')
    }
  }

  private async generateAndSendPdf(items: string[]): Promise<void> {
    const pdfPath = criarPDFRetornarCaminho(items, 'Relatorio de despesas')
    await new Promise(r => setTimeout(r, 1000))
    const url = await upload(pdfPath)
    if (url) {
      sendEmail({
        to: ADMIN_EMAIL,
        subject: 'Relatorio de despesas',
        message: 'Segue em anexo',
        attachmentLink: url,
      })
    }
  }

  protected getUsage() { return '`$relatorio`' }
}
