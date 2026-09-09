import { MongoConnection } from '../../../../src/infrastructure/database/MongoConnection'
import {
  getMonthlySummaryFromMongo,
  insertOrganizzeTransaction,
  ORGANIZZE_MONTHLY_FOOD_COLLECTION,
  ORGANIZZE_MONTHLY_INTEREST_COLLECTION,
  ORGANIZZE_TRANSACTIONS_COLLECTION,
  resetOrganizzeMongoIndexesForTests,
  upsertMonthlyFoodSpending,
  upsertMonthlyInterest,
} from '../../../../src/services/finance/OrganizzeMongoRepository'
import { lastNSaoPauloMonths } from '../../../../src/services/finance/saoPauloCalendar'

jest.mock('../../../../src/infrastructure/database/MongoConnection')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}))

type StoreDoc = Record<string, unknown>

function createMemoryCollection() {
  const docs: StoreDoc[] = []
  return {
    docs,
    createIndex: jest.fn().mockResolvedValue('ok'),
    insertOne: jest.fn(async (doc: StoreDoc) => {
      const insertedId = `id-${docs.length + 1}`
      docs.push({ ...doc, _id: insertedId })
      return { insertedId }
    }),
    updateOne: jest.fn(async (
      filter: { year: number; month: number },
      update: { $set: StoreDoc },
      options?: { upsert?: boolean },
    ) => {
      const idx = docs.findIndex(d => d.year === filter.year && d.month === filter.month)
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...update.$set }
        return { matchedCount: 1, upsertedCount: 0 }
      }
      if (options?.upsert) {
        docs.push({ ...update.$set })
        return { matchedCount: 0, upsertedCount: 1 }
      }
      return { matchedCount: 0, upsertedCount: 0 }
    }),
    find: jest.fn((filter: Record<string, unknown> = {}) => ({
      toArray: async () => {
        if (filter.$or && Array.isArray(filter.$or)) {
          return docs.filter(d =>
            (filter.$or as Array<{ year: number; month: number }>).some(
              f => f.year === d.year && f.month === d.month,
            ),
          )
        }
        if (typeof filter.year === 'number' && typeof filter.month === 'number') {
          return docs.filter(d => d.year === filter.year && d.month === filter.month)
        }
        return [...docs]
      },
    })),
  }
}

const collections: Record<string, ReturnType<typeof createMemoryCollection>> = {}

function memoryColl(name: string): ReturnType<typeof createMemoryCollection> {
  const c = collections[name]
  if (!c) throw new Error(`missing collection ${name}`)
  return c
}

function resetCollections() {
  collections[ORGANIZZE_TRANSACTIONS_COLLECTION] = createMemoryCollection()
  collections[ORGANIZZE_MONTHLY_INTEREST_COLLECTION] = createMemoryCollection()
  collections[ORGANIZZE_MONTHLY_FOOD_COLLECTION] = createMemoryCollection()
}

describe('OrganizzeMongoRepository', () => {
  beforeEach(() => {
    resetOrganizzeMongoIndexesForTests()
    resetCollections()
    jest.mocked(MongoConnection.getCollection).mockImplementation(name => {
      return collections[name] as never
    })
  })

  it('insere transacao local com data de Sao Paulo e nao chama API oficial', async () => {
    const now = new Date('2026-09-09T18:00:00.000Z')
    const result = await insertOrganizzeTransaction(
      {
        description: 'Padaria',
        notes: 'Criado pelo bot',
        category_id: 77,
        amount_cents: 1234,
      },
      now,
    )

    expect(result).toEqual({ id: 'id-1' })
    expect(memoryColl(ORGANIZZE_TRANSACTIONS_COLLECTION).docs).toEqual([
      expect.objectContaining({
        description: 'Padaria',
        notes: 'Criado pelo bot',
        category_id: 77,
        amount_cents: 1234,
        date: '2026-09-09',
        createdAt: now,
      }),
    ])
    expect(jest.mocked(MongoConnection.getCollection)).toHaveBeenCalledWith(ORGANIZZE_TRANSACTIONS_COLLECTION)
  })

  it('upsert de juros no mesmo mes deixa um documento com o valor mais recente', async () => {
    await upsertMonthlyInterest({ year: 2026, month: 9, amount_cents: 100 })
    await upsertMonthlyInterest({ year: 2026, month: 9, amount_cents: 250 })

    expect(memoryColl(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).docs).toHaveLength(1)
    expect(memoryColl(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).docs[0]).toEqual(
      expect.objectContaining({ year: 2026, month: 9, amount_cents: 250 }),
    )
    expect(memoryColl(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).createIndex).toHaveBeenCalledWith(
      { year: 1, month: 1 },
      { unique: true },
    )
  })

  it('upsert de alimentacao no mesmo mes deixa um documento com o valor mais recente', async () => {
    await upsertMonthlyFoodSpending({ year: 2026, month: 9, amount_cents: 500 })
    await upsertMonthlyFoodSpending({ year: 2026, month: 9, amount_cents: 800 })

    expect(memoryColl(ORGANIZZE_MONTHLY_FOOD_COLLECTION).docs).toHaveLength(1)
    expect(memoryColl(ORGANIZZE_MONTHLY_FOOD_COLLECTION).docs[0]).toEqual(
      expect.objectContaining({ year: 2026, month: 9, amount_cents: 800 }),
    )
  })

  it('resumo com year/month devolve os dois snapshots', async () => {
    await upsertMonthlyInterest({ year: 2026, month: 9, amount_cents: 40 })
    await upsertMonthlyFoodSpending({ year: 2026, month: 9, amount_cents: 1500 })

    await expect(getMonthlySummaryFromMongo(2026, 9)).resolves.toEqual({
      data: [{ year: 2026, month: 9, interest_cents: 40, food_spending_cents: 1500 }],
    })
  })

  it('resumo com year/month sem snapshots devolve nulls', async () => {
    await expect(getMonthlySummaryFromMongo(2026, 1)).resolves.toEqual({
      data: [{ year: 2026, month: 1, interest_cents: null, food_spending_cents: null }],
    })
  })

  it('janela padrao cobre so os ultimos seis meses e ignora competencias sem snapshot', async () => {
    const now = new Date('2026-09-09T15:00:00.000Z')
    const window = lastNSaoPauloMonths(6, now)
    const oldestInWindow = window[0]
    const newest = window[window.length - 1]
    if (!oldestInWindow || !newest) throw new Error('window')

    await upsertMonthlyInterest({
      year: oldestInWindow.year,
      month: oldestInWindow.month,
      amount_cents: 11,
    })
    await upsertMonthlyFoodSpending({
      year: newest.year,
      month: newest.month,
      amount_cents: 22,
    })
    await upsertMonthlyInterest({ year: 2025, month: 1, amount_cents: 99 })

    const summary = await getMonthlySummaryFromMongo(undefined, undefined, now)
    expect(summary.data).toHaveLength(2)
    expect(summary.data).toEqual([
      {
        year: oldestInWindow.year,
        month: oldestInWindow.month,
        interest_cents: 11,
        food_spending_cents: null,
      },
      {
        year: newest.year,
        month: newest.month,
        interest_cents: null,
        food_spending_cents: 22,
      },
    ])
    expect(summary.data.some(e => e.year === 2025 && e.month === 1)).toBe(false)
  })
})
