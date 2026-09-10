import axios from 'axios'
import { env } from '../../../../src/config/env'
import {
  createTransaction,
  getExpensesCategories,
  getFoodSpending,
  getInterest,
  getMonthlySummary,
  updateFoodSpending,
  updateInterest,
} from '../../../../src/services/finance/OrganizzeService'
import {
  ORGANIZZE_MONTHLY_FOOD_COLLECTION,
  ORGANIZZE_MONTHLY_INTEREST_COLLECTION,
  ORGANIZZE_TRANSACTIONS_COLLECTION,
  resetOrganizzeMongoIndexesForTests,
} from '../../../../src/services/finance/OrganizzeMongoRepository'
import { MongoConnection } from '../../../../src/infrastructure/database/MongoConnection'
import { saoPauloMonthRange } from '../../../../src/services/finance/saoPauloCalendar'

jest.mock('axios')
jest.mock('../../../../src/config/env', () => ({
  env: {
    ORGANIZZE_API_BASE_URL: 'https://api.organizze.com.br/rest/v2',
    ORGANIZZE_BASIC_USERNAME: 'user@example.com',
    ORGANIZZE_BASIC_PASSWORD: 'secret-token',
    ORGANIZZE_USER_AGENT: undefined as string | undefined,
  },
}))
jest.mock('../../../../src/infrastructure/database/MongoConnection')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>
const organizzeEnv = env as {
  ORGANIZZE_BASIC_USERNAME: string | undefined
  ORGANIZZE_BASIC_PASSWORD: string | undefined
}

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

describe('OrganizzeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetOrganizzeMongoIndexesForTests()
    organizzeEnv.ORGANIZZE_BASIC_USERNAME = 'user@example.com'
    organizzeEnv.ORGANIZZE_BASIC_PASSWORD = 'secret-token'
    collections[ORGANIZZE_TRANSACTIONS_COLLECTION] = createMemoryCollection()
    collections[ORGANIZZE_MONTHLY_INTEREST_COLLECTION] = createMemoryCollection()
    collections[ORGANIZZE_MONTHLY_FOOD_COLLECTION] = createMemoryCollection()
    jest.mocked(MongoConnection.getCollection).mockImplementation(name => {
      return collections[name] as never
    })
  })

  it('filtra categorias oficiais por kind expenses', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Mercado', kind: 'expenses' },
        { id: 2, name: 'Salario', kind: 'revenues' },
        { id: 3, name: 'Uber', kind: 'expenses' },
      ],
    })

    const result = await getExpensesCategories()

    expect(result.map(c => c.id)).toEqual([1, 3])
    expect(String(mockedAxios.get.mock.calls[0]?.[0])).toContain('/categories')
    expect(String(mockedAxios.get.mock.calls[0]?.[0])).not.toContain('herokuapp.com')
  })

  it('grava transacao no Mongo com o category_id oficial', async () => {
    await createTransaction({
      description: 'Almoco',
      notes: 'Criado pelo bot',
      category_id: 91,
      amount_cents: 4500,
    })

    expect(mockedAxios.get).not.toHaveBeenCalled()
    expect(memoryColl(ORGANIZZE_TRANSACTIONS_COLLECTION).docs[0]).toEqual(
      expect.objectContaining({
        description: 'Almoco',
        category_id: 91,
        amount_cents: 4500,
      }),
    )
  })

  it('calcula juros RecargaPay do mes atual via API oficial', async () => {
    const { startDate, endDate, year, month } = saoPauloMonthRange()
    const date = `${year}-${String(month).padStart(2, '0')}-10`
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        { id: 1, description: 'RECARGAPAY *A', date, amount_cents: -1000, category_id: 9 },
        { id: 2, description: 'Padaria', date, amount_cents: -500, category_id: 1 },
      ],
    }).mockResolvedValueOnce({ data: [] })

    const interest = await getInterest()

    expect(interest.year).toBe(year)
    expect(interest.month).toBe(month)
    expect(interest.interest_cents).toBe(40)
    expect(interest.items).toHaveLength(1)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/transactions'),
      expect.objectContaining({
        params: expect.objectContaining({ start_date: startDate, end_date: endDate }),
      }),
    )
  })

  it('calcula alimentacao pelas categorias oficiais e persiste snapshot', async () => {
    const { year, month } = saoPauloMonthRange()
    const date = `${year}-${String(month).padStart(2, '0')}-10`
    mockedAxios.get.mockImplementation(async (url: string, config?: { params?: { page?: number } }) => {
      if (String(url).endsWith('/categories')) {
        return {
          data: [
            { id: 1, name: 'Mercado', kind: 'expenses' },
            { id: 2, name: 'Transporte', kind: 'expenses' },
          ],
        }
      }
      if ((config?.params?.page ?? 1) > 1) {
        return { data: [] }
      }
      return {
        data: [
          { id: 10, description: 'Super', date, amount_cents: -3000, category_id: 1 },
          { id: 11, description: 'Uber', date, amount_cents: -800, category_id: 2 },
        ],
      }
    })

    const food = await getFoodSpending()
    expect(food.total_cents).toBe(3000)
    expect(food.items).toHaveLength(1)

    await updateFoodSpending(food)
    await updateInterest({
      interest_cents: 40,
      interest_brl: 0.4,
      year,
      month,
      items: [],
    })

    expect(memoryColl(ORGANIZZE_MONTHLY_FOOD_COLLECTION).docs[0]).toEqual(
      expect.objectContaining({ year, month, amount_cents: 3000 }),
    )
    expect(memoryColl(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).docs[0]).toEqual(
      expect.objectContaining({ year, month, amount_cents: 40 }),
    )
  })

  it('getMonthlySummary le o Mongo', async () => {
    await updateInterest({
      interest_cents: 70,
      interest_brl: 0.7,
      year: 2026,
      month: 6,
      items: [],
    })
    await updateFoodSpending({
      total_cents: 900,
      total_brl: 9,
      year: 2026,
      month: 6,
      items: [],
    })

    await expect(getMonthlySummary(2026, 6)).resolves.toEqual({
      data: [{ year: 2026, month: 6, interest_cents: 70, food_spending_cents: 900 }],
    })
  })
})
