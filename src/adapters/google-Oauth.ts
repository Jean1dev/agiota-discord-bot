import { google } from 'googleapis'
import { env } from '../config/env'
import { getGoogleOAuthToken, saveGoogleOAuthToken } from '../infrastructure/database/MongoRepository'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('GoogleOAuth')

const oAuth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_OAUTH_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube',
]

function getAuthUrl(): string {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
  })
}

function extractCodeFromInput(input: unknown): string | null {
  const trimmed = String(input).trim()
  if (trimmed.includes('code=')) {
    try {
      const urlStr = trimmed.startsWith('http') ? trimmed : `http://${trimmed.replace(/^\?/, '')}`
      const url = new URL(urlStr)
      return url.searchParams.get('code')
    } catch (_) {
      const match = trimmed.match(/[?&]code=([^&\s]+)/)
      return match ? match[1] ?? null : null
    }
  }
  return trimmed || null
}

function setAuthToken(tokenOrUrl: unknown): Promise<typeof oAuth2Client> {
  const code = extractCodeFromInput(tokenOrUrl) ?? String(tokenOrUrl)
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err: Error | null, token: any) => {
      if (err) {
        reject(err)
      } else {
        oAuth2Client.setCredentials(token as any)
        saveGoogleOAuthToken(token)
          .then(() => {
            googleOAuthState.authorized = true
            log.info('Token Google salvo no banco (expira em 7 dias)')
            resolve(oAuth2Client)
          })
          .catch(reject)
      }
    })
  })
}

export const googleOAuthState = {
  client: oAuth2Client,
  authorized: false,
  authUrl: getAuthUrl() as string | null,
  setAuthToken,
  getAuthUrl,
  loadTokenFromDb: async (): Promise<void> => { /* assigned below */ },
}

async function loadTokenFromDb(): Promise<void> {
  const token = await getGoogleOAuthToken()
  if (token) {
    oAuth2Client.setCredentials(token as any)
    googleOAuthState.authorized = true
    googleOAuthState.authUrl = null
    log.info('Token Google carregado do banco')
  } else {
    googleOAuthState.authorized = false
    googleOAuthState.authUrl = getAuthUrl()
  }
}

googleOAuthState.loadTokenFromDb = loadTokenFromDb

export default googleOAuthState
