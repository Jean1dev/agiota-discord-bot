import axios from 'axios'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('KeycloakService')

const TOKEN_URL =
  'https://lemur-5.cloud-iam.com/auth/realms/caixinha-auth-server/protocol/openid-connect/token'

export async function getKeycloakToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: env.ADMIN_KEYCLOACK_CLIENT_ID ?? '',
    username: env.ADMIN_KEYCLOACK_USERNAME ?? '',
    password: env.ADMIN_KEYCLOACK_PASSWORD ?? '',
  })

  try {
    const response = await axios.post<{ access_token: string }>(TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data.access_token
  } catch (err) {
    log.error({ err }, 'failed to get Keycloak token')
    throw err
  }
}
