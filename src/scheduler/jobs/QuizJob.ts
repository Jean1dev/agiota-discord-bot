import { IJob } from '../IJob'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runQuizTask } = require('../../services')

/**
 * Runs at 9:02, 12:02, 15:02, 18:02 on Monday, Tuesday, Wednesday.
 * Posts a quiz question to the Discord channel.
 */
export class QuizJob implements IJob {
  readonly cronExpression = '2 9-19/3 * * 1-3'

  async run(): Promise<void> {
    await runQuizTask()
  }
}
