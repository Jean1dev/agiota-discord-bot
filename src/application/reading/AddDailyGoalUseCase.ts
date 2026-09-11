import { IReadingRepository } from '../../domain/reading/IReadingRepository'
import { ReadingTracker } from '../../domain/reading/ReadingTracker'
import { Result } from '../../domain/shared/Result'

export class AddDailyGoalUseCase {
  constructor(private readonly readingRepo: IReadingRepository) {}

  async execute(pages: number): Promise<Result<ReadingTracker>> {
    return Result.fromAsync(async () => {
      const tracker = await this.readingRepo.get()
      const updated = tracker.subtract(pages)
      await this.readingRepo.save(updated)
      return updated
    })
  }
}
