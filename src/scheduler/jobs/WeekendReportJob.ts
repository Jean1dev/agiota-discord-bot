import { IJob } from '../IJob'
import { myDailyBudgetService } from '../../services'

/**
 * Runs every Monday at 11:15.
 * Generates the expense report for the previous weekend.
 */
export class WeekendReportJob implements IJob {
  readonly cronExpression = '15 11 * * 1'

  async run(): Promise<void> {
    await myDailyBudgetService.gerarReportDosGastosDoUltimoFinalDeSemana()
  }
}
