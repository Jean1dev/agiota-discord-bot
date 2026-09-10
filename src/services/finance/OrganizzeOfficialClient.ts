import axios, { AxiosRequestConfig } from 'axios'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('OrganizzeOfficialClient')
const TIMEOUT_MS = 30_000
const MAX_PAGES = 50

export class MissingOrganizzeCredentialsError extends Error {
  constructor() {
    super('Organizze não configurado: defina ORGANIZZE_BASIC_USERNAME e ORGANIZZE_BASIC_PASSWORD')
    this.name = 'MissingOrganizzeCredentialsError'
  }
}

export interface OfficialCategory {
  id: number
  name: string
  kind: string
  [key: string]: unknown
}

export interface OfficialTransaction {
  id: number
  description: string
  date: string
  amount_cents: number
  category_id: number
  [key: string]: unknown
}

function requireCredentials(): {
  baseURL: string
  username: string
  password: string
  userAgent: string
} {
  const username = env.ORGANIZZE_BASIC_USERNAME
  const password = env.ORGANIZZE_BASIC_PASSWORD
  if (!username || !password) {
    throw new MissingOrganizzeCredentialsError()
  }
  return {
    baseURL: env.ORGANIZZE_API_BASE_URL.replace(/\/+$/, ''),
    username,
    password,
    userAgent: env.ORGANIZZE_USER_AGENT || username,
  }
}

function authHeaders(username: string, password: string, userAgent: string): Record<string, string> {
  const encoded = Buffer.from(`${username}:${password}`, 'utf8').toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    'User-Agent': userAgent,
    Accept: 'application/json',
  }
}

async function officialGet<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const { baseURL, username, password, userAgent } = requireCredentials()
  const config: AxiosRequestConfig = {
    timeout: TIMEOUT_MS,
    headers: authHeaders(username, password, userAgent),
  }
  if (params) config.params = params
  const { data } = await axios.get<T>(`${baseURL}${path}`, config)
  return data
}

export async function fetchOfficialCategories(): Promise<OfficialCategory[]> {
  try {
    const data = await officialGet<OfficialCategory[]>('/categories')
    return Array.isArray(data) ? data : []
  } catch (err) {
    if (err instanceof MissingOrganizzeCredentialsError) throw err
    log.error({ err }, 'Falha ao buscar categorias na API oficial do Organizze')
    throw err
  }
}

export async function fetchOfficialTransactions(
  startDate: string,
  endDate: string,
): Promise<OfficialTransaction[]> {
  requireCredentials()
  const all: OfficialTransaction[] = []
  const seen = new Set<number>()
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await officialGet<OfficialTransaction[]>('/transactions', {
        start_date: startDate,
        end_date: endDate,
        page,
      })
      const batch = Array.isArray(data) ? data : []
      if (batch.length === 0) break
      let added = 0
      for (const tx of batch) {
        if (seen.has(tx.id)) continue
        seen.add(tx.id)
        all.push(tx)
        added += 1
      }
      if (added === 0) break
    }
    return all
  } catch (err) {
    if (err instanceof MissingOrganizzeCredentialsError) throw err
    log.error({ err, startDate, endDate }, 'Falha ao buscar transações na API oficial do Organizze')
    throw err
  }
}
