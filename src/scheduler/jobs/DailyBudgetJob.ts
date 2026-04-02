import { IJob } from '../IJob'
import { myDailyBudgetService } from '../../services'

/**
 * Runs daily at 22:05.
 * Executes end-of-day budget handles (summaries, notifications).
 */
export class DailyBudgetJob implements IJob {
  readonly cronExpression = '5 22 * * *'

  async run(): Promise<void> {
    await myDailyBudgetService.dailyHandles()
  }
}
