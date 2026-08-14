import { IReadingRepository } from '../../domain/reading/IReadingRepository'
import { ReadingTracker } from '../../domain/reading/ReadingTracker'
import { DailyGoal, PagesRead } from '../../domain/reading/ReadingEntry'
import { MongoConnection } from './MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoReadingRepository')

// ── Tipos que espelham o schema persistido no MongoDB ──────────────────────

interface StoredGoal {
  id: string
  paginas: number
  data: Date | string
}

interface StoredReading {
  id: string
  paginas: number
  data: Date | string
}

interface StoredReadingTracker {
  metas: StoredGoal[]
  leituras: StoredReading[]
}

interface DataDocument {
  leituraPaginas?: StoredReadingTracker
}

const COLLECTION = 'data'

// ── Mapeamento entre schema armazenado e domain model ──────────────────────

function toDomain(stored: StoredReadingTracker | undefined): ReadingTracker {
  const goals = (stored?.metas ?? []).map(g =>
    DailyGoal.reconstitute({ id: g.id, pages: Number(g.paginas), createdAt: new Date(g.data) }),
  )

  const readings = (stored?.leituras ?? []).map(r =>
    PagesRead.reconstitute({ id: r.id, pages: Number(r.paginas), createdAt: new Date(r.data) }),
  )

  return new ReadingTracker(goals, readings)
}

function toStored(tracker: ReadingTracker): StoredReadingTracker {
  return {
    metas: tracker.goals.map(g => ({ id: g.id, paginas: g.pages, data: g.createdAt })),
    leituras: tracker.readings.map(r => ({ id: r.id, paginas: r.pages, data: r.createdAt })),
  }
}

// ── Repositório ────────────────────────────────────────────────────────────

/**
 * Persiste o débito de leitura no mesmo documento de estado usado pelas
 * dívidas (`dividas`), sob o campo `leituraPaginas`.
 */
export class MongoReadingRepository implements IReadingRepository {
  private collection() {
    return MongoConnection.getCollection<DataDocument>(COLLECTION)
  }

  async get(): Promise<ReadingTracker> {
    const docs = await this.collection().find({}).toArray()
    return toDomain(docs[0]?.leituraPaginas)
  }

  async save(tracker: ReadingTracker): Promise<void> {
    const stored = toStored(tracker)
    await this.collection().updateOne(
      {},
      { $set: { leituraPaginas: stored } },
      { upsert: true },
    )
    log.debug({ debt: tracker.pagesDebt }, 'leituraPaginas persistida')
  }
}
