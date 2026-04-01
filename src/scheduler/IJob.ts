export interface IJob {
  /** Standard 5-field cron expression (e.g. "0 * * * *") */
  readonly cronExpression: string
  run(): Promise<void>
}
