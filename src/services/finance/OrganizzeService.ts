import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('OrganizzeService')

const apiCall = axios.create({
  baseURL: 'https://organizze-service-50474ce67034.herokuapp.com',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json', 'client-info': 'discord-bot' },
})

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

function handleError(err: unknown): never {
  const e = err as { isAxiosError?: boolean; response?: { data: unknown }; message: string }
  if (e.isAxiosError) {
    log.error({ data: e.response?.data, message: e.message }, 'Organizze API error')
  }
  throw err
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data } = await apiCall.get<Category[]>('/categories')
    return data
  } catch (err) { handleError(err) }
}

export async function getCategory(id: number): Promise<Category> {
  try {
    const { data } = await apiCall.get<Category>(`/categories/${id}`)
    return data
  } catch (err) { handleError(err) }
}

export interface TransactionItem {
  id: number
  description: string
  date: string
  amount_cents: number
  category_id: number
  notes?: string
  [key: string]: unknown
}

export async function getTransactions(): Promise<TransactionItem[]> {
  try {
    const { data } = await apiCall.get<TransactionItem[]>('/transactions')
    return data
  } catch (err) { handleError(err) }
}

export async function createTransaction(transactionData: Transaction): Promise<unknown> {
  const { description, notes, category_id, amount_cents } = transactionData
  try {
    const { data } = await apiCall.post('/transactions', { description, notes, category_id, amount_cents })
    return data
  } catch (err) { handleError(err) }
}

export async function getExpensesCategories(): Promise<Category[]> {
  const categories = await getCategories()
  return categories.filter(c => c.kind === 'expenses')
}

export interface Interest {
  interest_cents: number
  year: number
  month: number
}

export async function getInterest(): Promise<Interest> {
  try {
    const { data } = await apiCall.get<Interest>('/interest')
    return data
  } catch (err) { handleError(err) }
}

export async function updateInterest(interest: Interest): Promise<unknown> {
  try {
    const { data } = await apiCall.post('/interest', {
      amount_cents: interest.interest_cents,
      year: interest.year,
      month: interest.month,
    })
    return data
  } catch (err) { handleError(err) }
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

export async function getFoodSpending(): Promise<FoodSpending> {
  try {
    const { data } = await apiCall.get<FoodSpending>('/food-spending')
    return data
  } catch (err) { handleError(err) }
}

export async function updateFoodSpending(foodSpending: FoodSpending): Promise<unknown> {
  try {
    const { data } = await apiCall.post('/food-spending', {
      amount_cents: foodSpending.total_cents,
      year: foodSpending.year,
      month: foodSpending.month,
    })
    return data
  } catch (err) { handleError(err) }
}
