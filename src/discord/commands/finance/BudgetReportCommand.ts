import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

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

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly budgetService = require('../../../services/myDailyBudget')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly pdfService = require('../../../services/GerarPDF')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly uploadService = require('../../../services/UploadService')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly emailService = require('../../../services/EmailService')

  protected async handle(message: DiscordMessage): Promise<void> {
    try {
      const result: string[] = await this.budgetService.gerarRelatorioFechamentoCompentencia()

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
    const path: string = this.pdfService('Relatorio de despesas', items)
    await new Promise(r => setTimeout(r, 1000))
    const url: string = await this.uploadService(path)
    if (url) {
      this.emailService({
        to: 'jeanlucafp@gmail.com',
        subject: 'Relatorio de despesas',
        message: 'Segue em anexo',
        attachmentLink: url,
      })
    }
  }

  protected getUsage() { return '`$relatorio`' }
}
