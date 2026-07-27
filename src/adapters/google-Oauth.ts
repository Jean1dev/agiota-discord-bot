import { Auth, google } from 'googleapis'
import crypto from 'crypto'
import { env } from '../config/env'
import { getGoogleOAuthToken, saveGoogleOAuthToken } from '../infrastructure/database/MongoRepository'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('GoogleOAuth')

const oAuth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_OAUTH_REDIRECT_URI
)

// O googleapis (via gaxios) carrega o `node-fetch` por padrão, que quebra ao
// descomprimir gzip no Node 24 (ERR_STREAM_PREMATURE_CLOSE) — foi o que fazia
// o refresh do token em https://oauth2.googleapis.com/token falhar. Forçamos o
// `fetch` nativo (undici), pela mesma razão da migração do discord.js p/ v14.
const nativeFetch = globalThis.fetch
;(oAuth2Client as unknown as {
  transporter: { defaults: { fetchImplementation?: typeof fetch } }
}).transporter.defaults.fetchImplementation = nativeFetch
google.options({ fetchImplementation: nativeFetch } as never)

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/youtube',
]

export const GOOGLE_OAUTH_SCOPES = {
  all: SCOPES,
  youtube: ['https://www.googleapis.com/auth/youtube'],
}

const AUTH_SESSION_TTL_MS = 10 * 60 * 1000
const authSessions = new Map<string, { codeVerifier: string; createdAt: number }>()
let latestAuthState: string | null = null

function base64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(crypto.randomBytes(64))
  const codeChallenge = base64Url(
    crypto.createHash('sha256').update(codeVerifier).digest()
  )
  return { codeVerifier, codeChallenge }
}

function pruneExpiredAuthSessions(now = Date.now()): void {
  for (const [state, session] of authSessions) {
    if (now - session.createdAt > AUTH_SESSION_TTL_MS) authSessions.delete(state)
  }
  if (latestAuthState && !authSessions.has(latestAuthState)) latestAuthState = null
}

function consumeCodeVerifier(state: string | null): string | undefined {
  pruneExpiredAuthSessions()
  const resolvedState = state && authSessions.has(state) ? state : latestAuthState
  if (!resolvedState) return undefined

  const session = authSessions.get(resolvedState)
  authSessions.delete(resolvedState)
  if (latestAuthState === resolvedState) latestAuthState = null
  return session?.codeVerifier
}

function getAuthUrl(scopes: string[] = GOOGLE_OAUTH_SCOPES.all): string {
  pruneExpiredAuthSessions()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const state = crypto.randomBytes(16).toString('hex')
  authSessions.set(state, { codeVerifier, createdAt: Date.now() })
  latestAuthState = state

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: Auth.CodeChallengeMethod.S256,
  })
}

function extractAuthResponseFromInput(input: unknown): { code: string; state: string | null } | null {
  const trimmed = String(input).trim()
  if (trimmed.includes('code=')) {
    try {
      const urlStr = trimmed.startsWith('http') ? trimmed : `http://${trimmed.replace(/^\?/, '')}`
      const url = new URL(urlStr)
      const code = url.searchParams.get('code')
      return code ? { code, state: url.searchParams.get('state') } : null
    } catch (_) {
      const match = trimmed.match(/[?&]code=([^&\s]+)/)
      const stateMatch = trimmed.match(/[?&]state=([^&\s]+)/)
      return match
        ? { code: decodeURIComponent(match[1] ?? ''), state: stateMatch ? decodeURIComponent(stateMatch[1] ?? '') : null }
        : null
    }
  }
  return trimmed ? { code: trimmed, state: null } : null
}

function setAuthToken(tokenOrUrl: unknown): Promise<typeof oAuth2Client> {
  const authResponse = extractAuthResponseFromInput(tokenOrUrl) ?? { code: String(tokenOrUrl), state: null }
  const codeVerifier = consumeCodeVerifier(authResponse.state)
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken({
      code: authResponse.code,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      ...(codeVerifier ? { codeVerifier } : {}),
    }, (err: Error | null, token: any) => {
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
