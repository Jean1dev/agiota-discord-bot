import axios from 'axios'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('LlmUsageReportService')

export interface LlmUsageMetrics {
  spend: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  api_requests: number
  successful_requests: number
  failed_requests: number
}

interface BreakdownEntry {
  metrics?: Partial<LlmUsageMetrics>
  metadata?: { key_alias?: string | null; [key: string]: unknown }
}

export interface LlmDailyActivityDay {
  date: string
  metrics?: Partial<LlmUsageMetrics>
  breakdown?: {
    models?: Record<string, BreakdownEntry>
    providers?: Record<string, BreakdownEntry>
    api_keys?: Record<string, BreakdownEntry>
  }
}

export interface LlmDailyActivityResponse {
  results: LlmDailyActivityDay[]
  metadata?: Record<string, unknown>
}

export interface RankingEntry {
  name: string
  metrics: LlmUsageMetrics
}

export interface LlmUsageReport {
  startDate: string
  endDate: string
  /** Um item por dia do intervalo, com dias sem uso zerados. */
  days: Array<{ date: string; metrics: LlmUsageMetrics }>
  totals: LlmUsageMetrics
  models: RankingEntry[]
  providers: RankingEntry[]
  apiKeys: RankingEntry[]
  isEmpty: boolean
}

export function emptyMetrics(): LlmUsageMetrics {
  return {
    spend: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    api_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
  }
}

function num(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number)
  return Number.isFinite(n) ? n : 0
}

function addMetrics(target: LlmUsageMetrics, source: Partial<LlmUsageMetrics> | undefined): void {
  if (!source) return
  for (const key of Object.keys(target) as Array<keyof LlmUsageMetrics>) {
    target[key] += num(source[key])
  }
}

/** Formata uma data como YYYY-MM-DD em UTC. */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Intervalo dos últimos `days` dias (inclui hoje), calculado em UTC. */
export function lastDaysUtcRange(days: number, now: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  start.setUTCDate(end.getUTCDate() - (days - 1))
  return { startDate: toUtcDateString(start), endDate: toUtcDateString(end) }
}

/** Lista todas as datas YYYY-MM-DD entre start e end (inclusivo). */
export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toUtcDateString(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/** `spend` vem em USD com muitas casas; até 4 casas para valores pequenos. */
export function formatUsd(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  if (v === 0) return '$0.00'
  if (Math.abs(v) < 1) return `$${v.toFixed(4)}`
  return `$${v.toFixed(2)}`
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(Number.isFinite(value) ? value : 0))
}

/** key_alias pode vir vazio para chaves sem alias/apagadas: usa o hash abreviado. */
export function apiKeyLabel(hash: string, alias: string | null | undefined): string {
  const trimmed = alias?.trim()
  return trimmed ? trimmed : hash.slice(0, 8)
}

function aggregateBreakdown(
  results: LlmDailyActivityDay[],
  pickMap: (day: LlmDailyActivityDay) => Record<string, BreakdownEntry> | undefined,
  label: (key: string, entry: BreakdownEntry) => string = key => key,
): RankingEntry[] {
  const acc = new Map<string, RankingEntry>()
  for (const day of results) {
    const map = pickMap(day) ?? {}
    for (const [key, entry] of Object.entries(map)) {
      let item = acc.get(key)
      if (!item) {
        item = { name: label(key, entry), metrics: emptyMetrics() }
        acc.set(key, item)
      }
      addMetrics(item.metrics, entry?.metrics)
    }
  }
  // Mapas do breakdown não têm ordem: ranking por spend, desempate por requests.
  return [...acc.values()].sort(
    (a, b) => b.metrics.spend - a.metrics.spend || b.metrics.api_requests - a.metrics.api_requests,
  )
}

/** Consolida a resposta do endpoint em um relatório pronto para exibição. */
export function buildUsageReport(
  response: LlmDailyActivityResponse,
  startDate: string,
  endDate: string,
): LlmUsageReport {
  const results = Array.isArray(response?.results) ? response.results : []

  const byDate = new Map<string, LlmUsageMetrics>()
  for (const day of results) {
    const m = emptyMetrics()
    addMetrics(m, day.metrics)
    byDate.set(day.date, m)
  }

  // Dias sem uso não vêm em `results`: preenche com métricas zeradas.
  const days = enumerateDates(startDate, endDate).map(date => ({
    date,
    metrics: byDate.get(date) ?? emptyMetrics(),
  }))

  const totals = emptyMetrics()
  days.forEach(d => addMetrics(totals, d.metrics))

  return {
    startDate,
    endDate,
    days,
    totals,
    models: aggregateBreakdown(results, d => d.breakdown?.models),
    providers: aggregateBreakdown(results, d => d.breakdown?.providers),
    apiKeys: aggregateBreakdown(
      results,
      d => d.breakdown?.api_keys,
      (hash, entry) => apiKeyLabel(hash, entry?.metadata?.key_alias),
    ),
    isEmpty: results.length === 0 || totals.api_requests === 0,
  }
}

/** LITELLM_BASE_URL sempre termina em /v1; o endpoint de atividade fica na raiz do gateway. */
export function gatewayBaseUrl(): string | undefined {
  return env.LITELLM_BASE_URL?.replace(/\/v1$/, '')
}

/**
 * Consome GET {gateway}/user/daily/activity (datas em UTC, inclusivas).
 * Sempre uma única página — o endpoint não pagina na prática.
 */
export async function fetchDailyActivity(startDate: string, endDate: string): Promise<LlmDailyActivityResponse> {
  const baseUrl = gatewayBaseUrl()
  const apiKey = env.LITELLM_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('LiteLLM não configurado: defina LITELLM_BASE_URL e LITELLM_API_KEY')
  }

  const url = `${baseUrl}/user/daily/activity`
  log.info({ url, startDate, endDate }, 'Buscando uso diário do LiteLLM')

  try {
    const { data } = await axios.get<LlmDailyActivityResponse>(url, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30_000,
    })
    return data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const apiMessage = (err.response.data as { error?: { message?: string } })?.error?.message
      throw new Error(`LiteLLM /user/daily/activity respondeu ${err.response.status}: ${apiMessage ?? err.message}`)
    }
    throw err
  }
}

export async function fetchUsageReport(days = 7, now: Date = new Date()): Promise<LlmUsageReport> {
  const { startDate, endDate } = lastDaysUtcRange(days, now)
  const response = await fetchDailyActivity(startDate, endDate)
  return buildUsageReport(response, startDate, endDate)
}
