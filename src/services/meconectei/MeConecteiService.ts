import axios from 'axios'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MeConecteiService')

const BASE_URL = env.ME_CONECTEI_API_URL ?? 'https://me-conectei-svc-temp-4f6577936f24.herokuapp.com'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const all = upper + lower + digits
  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)] as string,
    lower[Math.floor(Math.random() * lower.length)] as string,
    digits[Math.floor(Math.random() * digits.length)] as string,
  ]
  for (let i = chars.length; i < length; i++) chars.push(all[Math.floor(Math.random() * all.length)] as string)
  return chars.sort(() => Math.random() - 0.5).join('')
}

export async function createAdminUser(email: string, password: string): Promise<unknown> {
  const { data } = await client.post('/admin/createAdminUser', { email, password })
  return data
}

export async function getCompanyProxy(query: string): Promise<unknown> {
  const { data } = await client.get('/company/proxy', { params: { query } })
  return data
}

export async function getClientSearch(latitude: number, longitude: number): Promise<unknown> {
  const { data } = await client.get('/client/search', { params: { lat: latitude, lng: longitude } })
  return data
}

export async function postPessoasInteressadas(payload: unknown): Promise<unknown> {
  const { data } = await client.post('/client/pessoas-interessadas', payload)
  return data
}
