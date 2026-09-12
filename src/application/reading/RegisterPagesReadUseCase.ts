import { IReadingRepository } from '../../domain/reading/IReadingRepository'
import { ReadingTracker } from '../../domain/reading/ReadingTracker'
import { Result } from '../../domain/shared/Result'

export interface RegisterPagesReadDto {
  pages: number
}

export class RegisterPagesReadUseCase {
  constructor(private readonly readingRepo: IReadingRepository) {}

  async execute(dto: RegisterPagesReadDto): Promise<Result<ReadingTracker>> {
    return Result.fromAsync(async () => {
      const tracker = await this.readingRepo.get()
      const updated = tracker.add(dto.pages)
      await this.readingRepo.save(updated)
      return updated
    })
  }
}
