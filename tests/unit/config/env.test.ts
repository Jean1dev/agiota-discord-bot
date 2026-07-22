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
})
