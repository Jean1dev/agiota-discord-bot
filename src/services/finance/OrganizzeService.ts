import { createLogger } from '../../shared/logger/Logger'
import {
  fetchOfficialCategories,
  fetchOfficialTransactions,
} from './OrganizzeOfficialClient'
import {
  getMonthlySummaryFromMongo,
  insertOrganizzeTransaction,
  upsertMonthlyFoodSpending,
  upsertMonthlyInterest,
} from './OrganizzeMongoRepository'
import {
  monthlyRecargapayTransactions,
  totalInterestCents,
  transactionSummaryForConference,
} from './interestCalculation'
import {
  monthlyFoodTransactions,
  totalFoodSpendingCents,
  transactionSummary as foodTransactionSummary,
} from './foodSpendingCalculation'
import { saoPauloMonthRange } from './saoPauloCalendar'

const log = createLogger('OrganizzeService')

export interface Category {
  id: number
  name: string
  kind: string
  [key: string]: unknown
}

export interface Transaction {
  description: string
  notes?: string
  category_id: number
  amount_cents: number
  [key: string]: unknown
}

export interface InterestItem {
  id: number
  description: string
  date: string
  amount_cents: number
  interest_cents: number
}

export interface Interest {
  interest_cents: number
  interest_brl: number
  year: number
  month: number
  items: InterestItem[]
}

export interface FoodSpendingItem {
  id: number
  description: string
  date: string
  amount_cents: number
  category_id: number
}

export interface FoodSpending {
  total_cents: number
  total_brl: number
  year: number
  month: number
  items: FoodSpendingItem[]
}

export interface MonthlySummaryEntry {
  year: number
  month: number
  interest_cents: number | null
  food_spending_cents: number | null
}

export interface MonthlySummaryResponse {
  data: MonthlySummaryEntry[]
}

function handleError(err: unknown): never {
  const e = err as { isAxiosError?: boolean; response?: { data: unknown }; message: string }
  if (e.isAxiosError) {
    log.error({ data: e.response?.data, message: e.message }, 'Organizze API error')
  }
  throw err
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await fetchOfficialCategories()
  } catch (err) {
    handleError(err)
  }
}

export async function createTransaction(transactionData: Transaction): Promise<unknown> {
  try {
    return await insertOrganizzeTransaction(transactionData)
  } catch (err) {
    handleError(err)
  }
}

export async function getExpensesCategories(): Promise<Category[]> {
  const categories = await getCategories()
  return categories.filter(c => c.kind === 'expenses')
}

export async function getInterest(): Promise<Interest> {
  try {
    const { year, month, startDate, endDate } = saoPauloMonthRange()
    const transactions = await fetchOfficialTransactions(startDate, endDate)
    const filtered = monthlyRecargapayTransactions(transactions, year, month)
    const items = filtered.map(transactionSummaryForConference)
    const interest_cents = totalInterestCents(filtered)
    return {
      interest_cents,
      interest_brl: interest_cents / 100,
      year,
      month,
      items,
    }
  } catch (err) {
    handleError(err)
  }
}

export async function updateInterest(interest: Interest): Promise<unknown> {
  try {
    await upsertMonthlyInterest({
      amount_cents: interest.interest_cents,
      year: interest.year,
      month: interest.month,
    })
    return { ok: true }
  } catch (err) {
    handleError(err)
  }
}

export async function getFoodSpending(): Promise<FoodSpending> {
  try {
    const { year, month, startDate, endDate } = saoPauloMonthRange()
    const [categories, transactions] = await Promise.all([
      fetchOfficialCategories(),
      fetchOfficialTransactions(startDate, endDate),
    ])
    const foodTxs = monthlyFoodTransactions(categories, transactions, year, month)
    const total_cents = totalFoodSpendingCents(foodTxs)
    return {
      total_cents,
      total_brl: total_cents / 100,
      year,
      month,
      items: foodTxs.map(foodTransactionSummary),
    }
  } catch (err) {
    handleError(err)
  }
}

export async function updateFoodSpending(foodSpending: FoodSpending): Promise<unknown> {
  try {
    await upsertMonthlyFoodSpending({
      amount_cents: foodSpending.total_cents,
      year: foodSpending.year,
      month: foodSpending.month,
    })
    return { ok: true }
  } catch (err) {
    handleError(err)
  }
}

export async function getMonthlySummary(
  year?: number,
  month?: number,
): Promise<MonthlySummaryResponse> {
  try {
    return await getMonthlySummaryFromMongo(year, month)
  } catch (err) {
    handleError(err)
  }
}
