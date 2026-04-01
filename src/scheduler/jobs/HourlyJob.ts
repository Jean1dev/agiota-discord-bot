import { IJob } from '../IJob'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { startAutoArbitrage, getRegistros, clearRegistros } = require('../../services')

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
