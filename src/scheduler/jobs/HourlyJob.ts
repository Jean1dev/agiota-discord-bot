import { IJob } from '../IJob'
import { startAutoArbitrage, getRegistros, clearRegistros } from '../../services'

/**
 * Runs every hour at minute 0.
 * - Triggers auto-arbitrage cycle
 * - Flushes in-memory analysis records
 */
export class HourlyJob implements IJob {
  readonly cronExpression = '0 * * * *'

  async run(): Promise<void> {
    startAutoArbitrage()
    const registros = getRegistros() as unknown[]
    if (registros.length) {
      clearRegistros()
    }
  }
}
