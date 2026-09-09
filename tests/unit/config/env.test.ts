const originalEnv = process.env

jest.mock('../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

function loadEnv(overrides: NodeJS.ProcessEnv = {}) {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    BOT_TOKEN: 'discord-token',
    MONGO_URL: 'mongodb://localhost:27017/bot',
    ...overrides,
  }

  return require('../../../src/config/env') as typeof import('../../../src/config/env')
}

describe('env', () => {
  afterEach(() => {
    process.env = originalEnv
    jest.resetModules()
  })

  it('usa 512 MB como default de CRYPTO_DB_STORAGE_LIMIT_BYTES', () => {
    const { env } = loadEnv({ CRYPTO_DB_STORAGE_LIMIT_BYTES: undefined })

    expect(env.CRYPTO_DB_STORAGE_LIMIT_BYTES).toBe(512 * 1024 * 1024)
  })

  it('mantem valor configurado quando CRYPTO_DB_STORAGE_LIMIT_BYTES e valido', () => {
    const { env } = loadEnv({ CRYPTO_DB_STORAGE_LIMIT_BYTES: '1000' })

    expect(env.CRYPTO_DB_STORAGE_LIMIT_BYTES).toBe(1000)
  })

  it('normaliza LITELLM_BASE_URL com sufixo /v1', () => {
    const { env } = loadEnv({
      LITELLM_BASE_URL: 'https://lite-llm-deploy-production.up.railway.app/',
      LITELLM_API_KEY: 'sk-test',
    })

    expect(env.LITELLM_BASE_URL).toBe('https://lite-llm-deploy-production.up.railway.app/v1')
    expect(env.LITELLM_API_KEY).toBe('sk-test')
  })

  it('usa a URL padrao da API oficial do Organizze quando a env esta ausente', () => {
    const { env } = loadEnv({
      ORGANIZZE_API_BASE_URL: undefined,
      ORGANIZZE_BASIC_USERNAME: undefined,
      ORGANIZZE_BASIC_PASSWORD: undefined,
      ORGANIZZE_USER_AGENT: undefined,
    })

    expect(env.ORGANIZZE_API_BASE_URL).toBe('https://api.organizze.com.br/rest/v2')
    expect(env.ORGANIZZE_BASIC_USERNAME).toBeUndefined()
    expect(env.ORGANIZZE_BASIC_PASSWORD).toBeUndefined()
    expect(env.ORGANIZZE_USER_AGENT).toBeUndefined()
  })

  it('trata credenciais Organizze em branco como ausentes e remove barra final da base URL', () => {
    const { env } = loadEnv({
      ORGANIZZE_API_BASE_URL: 'https://api.organizze.com.br/rest/v2/',
      ORGANIZZE_BASIC_USERNAME: '  ',
      ORGANIZZE_BASIC_PASSWORD: '',
      ORGANIZZE_USER_AGENT: '  bot@example.com  ',
    })

    expect(env.ORGANIZZE_API_BASE_URL).toBe('https://api.organizze.com.br/rest/v2')
    expect(env.ORGANIZZE_BASIC_USERNAME).toBeUndefined()
    expect(env.ORGANIZZE_BASIC_PASSWORD).toBeUndefined()
    expect(env.ORGANIZZE_USER_AGENT).toBe('bot@example.com')
  })
})
