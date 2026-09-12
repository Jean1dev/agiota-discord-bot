import { MongoConnection } from '../../../../src/infrastructure/database/MongoConnection'
import { saveContextState } from '../../../../src/infrastructure/database/MongoRepository'

jest.mock('../../../../src/infrastructure/database/MongoConnection')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}))

type StoreDoc = Record<string, unknown>

function createMemoryCollection() {
  const docs: StoreDoc[] = []
  return {
    docs,
    deleteMany: jest.fn(async () => {
      docs.length = 0
      return { deletedCount: 0 }
    }),
    insertOne: jest.fn(async (doc: StoreDoc) => {
      docs.push({ ...doc })
      return { insertedId: 'id-1' }
    }),
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

describe('saveContextState', () => {
  let col: ReturnType<typeof createMemoryCollection>

  beforeEach(() => {
    col = createMemoryCollection()
    jest.mocked(MongoConnection.getCollection).mockReturnValue(col as never)
  })

  it('preserva leituraPaginas ao salvar o estado do contexto', async () => {
    col.docs.push({
      dividas: [{ id: 'u1' }],
      jogoAberto: false,
      leituraPaginas: 15,
    })

    await saveContextState({
      dividas: [{ id: 'u1' }],
      jogoAberto: false,
      jogo: null,
      totalGastoCartao: 100,
      autoArbitragem: false,
      defaultChatModel: null,
    })

    const saved = col.docs[0]
    expect(saved).toBeDefined()
    expect(col.deleteMany).not.toHaveBeenCalled()
    expect(col.updateOne).toHaveBeenCalledWith(
      {},
      {
        $set: {
          dividas: [{ id: 'u1' }],
          jogoAberto: false,
          jogo: null,
          totalGastoCartao: 100,
          autoArbitragem: false,
          defaultChatModel: null,
        },
      },
      { upsert: true },
    )
    expect(saved?.leituraPaginas).toBe(15)
    expect(saved?.totalGastoCartao).toBe(100)
  })
})
