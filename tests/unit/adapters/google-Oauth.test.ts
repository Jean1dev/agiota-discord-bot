/**
 * Regressão do ERR_STREAM_PREMATURE_CLOSE no refresh do OAuth do Google.
 *
 * O googleapis (via gaxios) carrega o `node-fetch` por padrão, que quebra ao
 * descomprimir gzip no Node 23/24 — derrubava o refresh em
 * `POST https://oauth2.googleapis.com/token` e, em cascata, o `$yt-wl`.
 * A correção força o `fetch` nativo (undici) no transporter do OAuth2Client.
 *
 * Estes testes garantem que esse cabeamento não seja removido sem querer.
 */

// Evita a validação de env (process.exit) ao importar o adapter.
jest.mock('../../../src/config/env', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3131',
  },
}))

// O adapter toca o banco no carregamento do token — não queremos Mongo no teste.
jest.mock('../../../src/infrastructure/database/MongoRepository', () => ({
  getGoogleOAuthToken: jest.fn().mockResolvedValue(null),
  saveGoogleOAuthToken: jest.fn().mockResolvedValue(undefined),
}))

import { googleOAuthState } from '../../../src/adapters/google-Oauth'

describe('google-Oauth: transporter usa fetch nativo (undici), não node-fetch', () => {
  const transporter = (
    googleOAuthState.client as unknown as {
      transporter: { defaults: { fetchImplementation?: unknown } }
    }
  ).transporter

  it('injeta um fetchImplementation no transporter do OAuth2Client', () => {
    expect(transporter.defaults.fetchImplementation).toBeDefined()
    expect(typeof transporter.defaults.fetchImplementation).toBe('function')
  })

  it('o fetchImplementation é exatamente o fetch global (nativo), não o node-fetch', () => {
    expect(transporter.defaults.fetchImplementation).toBe(globalThis.fetch)
  })
})

describe('google-Oauth: fluxo PKCE para app instalado', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('gera URL com code_challenge S256, state e acesso offline', () => {
    const authUrl = googleOAuthState.getAuthUrl()
    const url = new URL(authUrl)

    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('include_granted_scopes')).toBe('true')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('state')).toBeTruthy()
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3131')
  })

  it('usa o code_verifier correspondente ao state ao trocar o codigo', async () => {
    const authUrl = googleOAuthState.getAuthUrl()
    const state = new URL(authUrl).searchParams.get('state')
    const getToken = jest
      .spyOn(googleOAuthState.client, 'getToken')
      .mockImplementation((options: any, callback: any) => {
        callback(null, { access_token: 'access', refresh_token: 'refresh' })
      })

    await googleOAuthState.setAuthToken(`http://localhost:3131?state=${state}&code=test-code`)

    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'test-code',
        redirect_uri: 'http://localhost:3131',
        codeVerifier: expect.any(String),
      }),
      expect.any(Function)
    )
  })
})
