import cron from 'node-cron'
import { IJob } from './IJob'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('JobScheduler')

export class JobScheduler {
  register(job: IJob): void {
    cron.schedule(job.cronExpression, async () => {
      const name = job.constructor.name
      log.info({ cron: job.cronExpression }, `Running job: ${name}`)
      try {
        await job.run()
        log.info({ cron: job.cronExpression }, `Job done: ${name}`)
      } catch (err) {
        log.error({ err, cron: job.cronExpression }, `Job failed: ${name}`)
      }
    })
    log.info({ cron: job.cronExpression }, `Registered job: ${job.constructor.name}`)
  }
}
