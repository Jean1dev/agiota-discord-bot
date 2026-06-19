import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'
import { env } from '../../config/env'

const log = createLogger('ComprasMercadoReportService')

const DEFAULT_BASE_URL =
  'https://merchant-receipt-analysis-8c20061837f6.herokuapp.com'

export interface TopStore {
  store: string
  totalSpent: number
  [key: string]: unknown
}

export interface StoreRankingEntry {
  store: string
  totalSpent: number
  visitCount: number
  averageTicket: number
  [key: string]: unknown
}

export interface CategorySpending {
  category: string
  totalSpent: number
  percentage: number
  itemCount: number
  [key: string]: unknown
}

export interface MonthlyReport {
  totalSpent: number
  purchaseCount: number
  averageTicket: number
  itemCount: number
  topStore: TopStore | null
  storeRanking: StoreRankingEntry[]
  spendingByCategory: CategorySpending[]
  [key: string]: unknown
}

function baseUrl(): string {
  return env.COMPRAS_MERCADO_API_URL ?? DEFAULT_BASE_URL
}

/**
 * Consome o endpoint GET /reports/:month (formato YYYY-MM) do serviço de
 * análise de compras de mercado e devolve o relatório consolidado do mês.
 */
export async function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  const url = `${baseUrl()}/reports/${month}`
  log.info({ url, month }, 'Buscando relatório mensal de compras')

  const { data } = await axios.get<MonthlyReport>(url, { timeout: 30_000 })

  log.info(
    { month, totalSpent: data?.totalSpent, purchaseCount: data?.purchaseCount },
    'Relatório mensal de compras recebido',
  )
  return data
}
