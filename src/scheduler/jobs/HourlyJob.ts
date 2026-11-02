import { IJob } from '../IJob'
import { getRegistros, clearRegistros } from '../../services'

/**
 * Runs every hour at minute 0.
 * - Flushes in-memory analysis records
 */
export class HourlyJob implements IJob {
  readonly cronExpression = '0 * * * *'

  async run(): Promise<void> {
    const registros = getRegistros() as unknown[]
    if (registros.length) {
      clearRegistros()
    }
  }
}
