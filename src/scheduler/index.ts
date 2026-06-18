import { JobScheduler } from './JobScheduler'
import { HourlyJob } from './jobs/HourlyJob'
import { MidnightJob } from './jobs/MidnightJob'
import { WeekendReportJob } from './jobs/WeekendReportJob'
import { DailyBudgetJob } from './jobs/DailyBudgetJob'
import { QuizJob } from './jobs/QuizJob'
import { YoutubeRssJob } from './jobs/YoutubeRssJob'
import { MonthlyMarketReportJob } from './jobs/MonthlyMarketReportJob'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('scheduler')

export function registerJobs(): void {
  const scheduler = new JobScheduler()

  scheduler.register(new HourlyJob())
  scheduler.register(new MidnightJob())
  scheduler.register(new WeekendReportJob())
  scheduler.register(new DailyBudgetJob())
  scheduler.register(new QuizJob())
  scheduler.register(new YoutubeRssJob())
  scheduler.register(new MonthlyMarketReportJob())

  log.info('All jobs registered')
}
