import { parseIsoDate } from './saoPauloCalendar'

export const INTEREST_RATE = 0.04
const recargapayPattern = /RECARGAPAY/i

export interface InterestSourceTransaction {
  id?: number
  description?: string
  date?: string
  amount_cents?: number
}

export function isExpense(transaction: InterestSourceTransaction): boolean {
  return (transaction.amount_cents ?? 0) < 0
}

export function isRecargapayTransaction(transaction: InterestSourceTransaction): boolean {
  return recargapayPattern.test(transaction.description ?? '')
}

export function isTransactionInMonth(
  transaction: InterestSourceTransaction,
  year: number,
  month: number,
): boolean {
  const parsed = transaction.date ? parseIsoDate(transaction.date) : null
  if (!parsed) return false
  return parsed.year === year && parsed.month === month
}

export function interestCentsForTransaction(transaction: InterestSourceTransaction): number {
  const absoluteCents = Math.abs(transaction.amount_cents ?? 0)
  return Math.trunc(absoluteCents * INTEREST_RATE)
}

export function totalInterestCents(transactions: InterestSourceTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + interestCentsForTransaction(tx), 0)
}

export function monthlyRecargapayTransactions(
  transactions: InterestSourceTransaction[],
  year: number,
  month: number,
): InterestSourceTransaction[] {
  return transactions.filter(
    tx => isTransactionInMonth(tx, year, month) && isExpense(tx) && isRecargapayTransaction(tx),
  )
}

export function transactionSummaryForConference(transaction: InterestSourceTransaction): {
  id: number
  description: string
  date: string
  amount_cents: number
  interest_cents: number
} {
  return {
    id: transaction.id ?? 0,
    description: transaction.description ?? '',
    date: transaction.date ?? '',
    amount_cents: transaction.amount_cents ?? 0,
    interest_cents: interestCentsForTransaction(transaction),
  }
}
