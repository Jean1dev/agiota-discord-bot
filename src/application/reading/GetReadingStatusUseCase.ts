import { IReadingRepository } from '../../domain/reading/IReadingRepository'
import { ReadingTracker } from '../../domain/reading/ReadingTracker'
import { Result } from '../../domain/shared/Result'

export class GetReadingStatusUseCase {
  constructor(private readonly readingRepo: IReadingRepository) {}

  async execute(): Promise<Result<ReadingTracker>> {
    return Result.fromAsync(() => this.readingRepo.get())
  }
}
