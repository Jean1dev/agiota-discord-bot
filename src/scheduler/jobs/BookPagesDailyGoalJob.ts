import { IJob } from '../IJob'
import { MongoReadingRepository } from '../../infrastructure/database/MongoReadingRepository'
import { AddDailyGoalUseCase } from '../../application/reading/AddDailyGoalUseCase'
import { DAILY_READING_GOAL_PAGES } from '../../config/constants'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('BookPagesDailyGoalJob')

/**
 * Runs daily at 00:05.
 * Subtrai a meta diária do saldo de leitura.
 */
export class BookPagesDailyGoalJob implements IJob {
  readonly cronExpression = '5 0 * * *'

  private readonly useCase = new AddDailyGoalUseCase(new MongoReadingRepository())

  async run(): Promise<void> {
    const result = await this.useCase.execute(DAILY_READING_GOAL_PAGES)

    if (!result.ok) {
      throw result.error
    }

    log.info({ pages: result.value.pages }, 'Meta diária de páginas debitada')
  }
}
