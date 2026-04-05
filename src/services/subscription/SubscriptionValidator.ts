import axios from 'axios'
import { getKeycloakToken } from '../auth/KeycloakService'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('SubscriptionValidator')

const SUBSCRIPTION_SERVER_URL = 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com'

export interface SubscriptionResult {
  found: boolean
  email?: string
  vigenteAte?: string
  isActive?: boolean
  tenant?: string
  error?: string
}

export async function getSubscriptionByEmail(email: string): Promise<SubscriptionResult> {
  try {
    const token = await getKeycloakToken()
    const { data } = await axios.get<{ email: string; vigenteAte: string }[]>(
      `${SUBSCRIPTION_SERVER_URL}/plano`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const plan = data.find(p => p.email.toLowerCase() === email.toLowerCase())
    if (!plan) return { found: false }
    return {
      found: true,
      email: plan.email,
      vigenteAte: plan.vigenteAte,
      isActive: new Date(plan.vigenteAte) >= new Date(),
    }
  } catch (err) {
    log.error({ err }, 'getSubscriptionByEmail failed')
    return { found: false, error: (err as Error).message }
  }
}

export async function getSubscriptionByEmailAllTenants(email: string): Promise<SubscriptionResult> {
  try {
    const token = await getKeycloakToken()
    const { data } = await axios.get<{ tenant: string; plano: { email: string; vigenteAte: string } }[]>(
      `${SUBSCRIPTION_SERVER_URL}/plano/buscar-todos-tenants?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!data?.length) return { found: false }
    const best = data.reduce((max, cur) =>
      new Date(cur.plano.vigenteAte) > new Date(max.plano.vigenteAte) ? cur : max
    )
    return {
      found: true,
      email: best.plano.email,
      vigenteAte: best.plano.vigenteAte,
      tenant: best.tenant,
      isActive: new Date(best.plano.vigenteAte) >= new Date(),
    }
  } catch (err) {
    log.error({ err }, 'getSubscriptionByEmailAllTenants failed')
    return { found: false, error: (err as Error).message }
  }
}
