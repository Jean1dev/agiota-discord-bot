import { parseIsoDate } from './saoPauloCalendar'

export const FOOD_CATEGORIES = new Set([
  'Bares e restaurantes',
  'Alimentação',
  'Meu Almoco',
  'Mercado',
])

export interface FoodSourceCategory {
  id?: number
  name?: string
}

export interface FoodSourceTransaction {
  id?: number
  description?: string
  date?: string
  amount_cents?: number
  category_id?: number
}

export function isFoodCategory(category: FoodSourceCategory): boolean {
  return FOOD_CATEGORIES.has(category.name ?? '')
}

export function foodCategoryIds(categories: FoodSourceCategory[]): Set<number> {
  return new Set(
    categories.filter(isFoodCategory).map(c => c.id).filter((id): id is number => id !== undefined),
  )
}

export function isExpense(transaction: FoodSourceTransaction): boolean {
  return (transaction.amount_cents ?? 0) < 0
}

export function isTransactionInMonth(
  transaction: FoodSourceTransaction,
  year: number,
  month: number,
): boolean {
  const parsed = transaction.date ? parseIsoDate(transaction.date) : null
  if (!parsed) return false
  return parsed.year === year && parsed.month === month
}

export function isFoodTransaction(transaction: FoodSourceTransaction, foodIds: Set<number>): boolean {
  return transaction.category_id !== undefined && foodIds.has(transaction.category_id)
}

export function totalFoodSpendingCents(transactions: FoodSourceTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + Math.abs(tx.amount_cents ?? 0), 0)
}

export function transactionSummary(transaction: FoodSourceTransaction): {
  id: number
  description: string
  date: string
  amount_cents: number
  category_id: number
} {
  return {
    id: transaction.id ?? 0,
    description: transaction.description ?? '',
    date: transaction.date ?? '',
    amount_cents: transaction.amount_cents ?? 0,
    category_id: transaction.category_id ?? 0,
  }
}

export function monthlyFoodTransactions(
  categories: FoodSourceCategory[],
  transactions: FoodSourceTransaction[],
  year: number,
  month: number,
): FoodSourceTransaction[] {
  const foodIds = foodCategoryIds(categories)
  return transactions.filter(
    tx => isFoodTransaction(tx, foodIds) && isExpense(tx) && isTransactionInMonth(tx, year, month),
  )
}
