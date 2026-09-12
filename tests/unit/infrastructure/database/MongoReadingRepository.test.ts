import { MongoConnection } from '../../../../src/infrastructure/database/MongoConnection'
import { MongoReadingRepository } from '../../../../src/infrastructure/database/MongoReadingRepository'
import { ReadingTracker } from '../../../../src/domain/reading/ReadingTracker'

jest.mock('../../../../src/infrastructure/database/MongoConnection')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}))

type StoreDoc = Record<string, unknown>

function createMemoryCollection() {
  const docs: StoreDoc[] = []
  return {
    docs,
    updateOne: jest.fn(async (
      _filter: Record<string, unknown>,
      update: { $set: StoreDoc },
      options?: { upsert?: boolean },
    ) => {
      if (docs.length > 0) {
        docs[0] = { ...docs[0], ...update.$set }
        return { matchedCount: 1, upsertedCount: 0 }
      }
      if (options?.upsert) {
        docs.push({ ...update.$set })
        return { matchedCount: 0, upsertedCount: 1 }
      }
      return { matchedCount: 0, upsertedCount: 0 }
    }),
    find: jest.fn(() => ({
      toArray: async () => [...docs],
    })),
  }
}

describe('MongoReadingRepository', () => {
  let col: ReturnType<typeof createMemoryCollection>
  let repo: MongoReadingRepository

  beforeEach(() => {
    col = createMemoryCollection()
    jest.mocked(MongoConnection.getCollection).mockReturnValue(col as never)
    repo = new MongoReadingRepository()
  })

  it('lê saldo numérico', async () => {
    col.docs.push({ leituraPaginas: 15 })

    const tracker = await repo.get()

    expect(tracker.pages).toBe(15)
  })

  it('converte o formato antigo de metas e leituras para saldo', async () => {
    col.docs.push({
      leituraPaginas: {
        metas: [{ paginas: 5 }, { paginas: 5 }],
        leituras: [{ paginas: 20 }],
      },
    })

    const tracker = await repo.get()

    expect(tracker.pages).toBe(10)
  })

  it('grava apenas o número', async () => {
    await repo.save(new ReadingTracker(15))

    expect(col.updateOne).toHaveBeenCalledWith(
      {},
      { $set: { leituraPaginas: 15 } },
      { upsert: true },
    )
    expect(col.docs[0]?.leituraPaginas).toBe(15)
  })
})
