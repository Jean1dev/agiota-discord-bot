import { ReadingTracker } from './ReadingTracker'

export interface IReadingRepository {
  get(): Promise<ReadingTracker>
  save(tracker: ReadingTracker): Promise<void>
}
