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
