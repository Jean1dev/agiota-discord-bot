import { IReadingRepository } from '../../domain/reading/IReadingRepository'
import { ReadingTracker } from '../../domain/reading/ReadingTracker'
import { MongoConnection } from './MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoReadingRepository')

interface LegacyGoal {
  paginas: number
}

interface LegacyReading {
  paginas: number
}

interface LegacyReadingTracker {
  metas?: LegacyGoal[]
  leituras?: LegacyReading[]
}

type StoredPages = number | LegacyReadingTracker

interface DataDocument {
  leituraPaginas?: StoredPages
}

const COLLECTION = 'data'

function toPages(stored: StoredPages | undefined): number {
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return stored
  }

  if (!stored || typeof stored !== 'object') {
    return 0
  }

  const goals = (stored.metas ?? []).reduce((sum, g) => sum + Number(g.paginas), 0)
  const readings = (stored.leituras ?? []).reduce((sum, r) => sum + Number(r.paginas), 0)
  return readings - goals
}

export class MongoReadingRepository implements IReadingRepository {
  private collection() {
    return MongoConnection.getCollection<DataDocument>(COLLECTION)
  }

  async get(): Promise<ReadingTracker> {
    const docs = await this.collection().find({}).toArray()
    return new ReadingTracker(toPages(docs[0]?.leituraPaginas))
  }

  async save(tracker: ReadingTracker): Promise<void> {
    await this.collection().updateOne(
      {},
      { $set: { leituraPaginas: tracker.pages } },
      { upsert: true },
    )
    log.debug({ pages: tracker.pages }, 'leituraPaginas persistida')
  }
}
