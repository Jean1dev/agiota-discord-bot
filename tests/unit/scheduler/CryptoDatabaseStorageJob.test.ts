const mockBroadcastDiscord = jest.fn()
jest.mock('../../../src/services/discord/BroadcastService', () => ({
  broadcastDiscord: (...args: unknown[]) => mockBroadcastDiscord(...args),
}))

const mockGetCryptoDatabaseUsage = jest.fn()
const mockCleanupCryptoDatabase = jest.fn()
jest.mock('../../../src/services/b3/CryptoDatabaseMaintenanceService', () => ({
  getCryptoDatabaseUsage: (...args: unknown[]) => mockGetCryptoDatabaseUsage(...args),
  cleanupCryptoDatabase: (...args: unknown[]) => mockCleanupCryptoDatabase(...args),
  formatBytes: (bytes: number) => `${bytes} B`,
}))

jest.mock('../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

import { CryptoDatabaseStorageJob } from '../../../src/scheduler/jobs/CryptoDatabaseStorageJob'

describe('CryptoDatabaseStorageJob', () => {
  const job = new CryptoDatabaseStorageJob()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCleanupCryptoDatabase.mockResolvedValue({
      databaseName: 'crypto',
      migrationMessage: 'migrado',
      migratedDocuments: 12,
      droppedCollections: ['orders', 'quotes'],
    })
  })

  it('roda a cada 30 minutos', () => {
    expect(job.cronExpression).toBe('*/30 * * * *')
  })

  it('nao alerta nem limpa abaixo de 50%', async () => {
    mockGetCryptoDatabaseUsage.mockResolvedValue({
      databaseName: 'crypto',
      usedBytes: 490,
      limitBytes: 1000,
      usagePercent: 49,
    })

    await job.run()

    expect(mockBroadcastDiscord).not.toHaveBeenCalled()
    expect(mockCleanupCryptoDatabase).not.toHaveBeenCalled()
  })

  it('alerta a cada checagem quando o uso esta entre 50% e 80%', async () => {
    mockGetCryptoDatabaseUsage.mockResolvedValue({
      databaseName: 'crypto',
      usedBytes: 650,
      limitBytes: 1000,
      usagePercent: 65,
    })

    await job.run()

    expect(mockBroadcastDiscord).toHaveBeenCalledTimes(1)
    expect(mockBroadcastDiscord).toHaveBeenCalledWith(expect.stringContaining('65.00%'))
    expect(mockCleanupCryptoDatabase).not.toHaveBeenCalled()
  })

  it('executa limpeza automatica quando passa de 80%', async () => {
    mockGetCryptoDatabaseUsage.mockResolvedValue({
      databaseName: 'crypto',
      usedBytes: 850,
      limitBytes: 1000,
      usagePercent: 85,
    })

    await job.run()

    expect(mockBroadcastDiscord).toHaveBeenCalledWith(expect.stringContaining('Iniciando limpeza automática'))
    expect(mockCleanupCryptoDatabase).toHaveBeenCalledTimes(1)
    expect(mockBroadcastDiscord).toHaveBeenCalledWith(expect.stringContaining('2 coleções removidas'))
  })

  it('nao faz nada quando o monitoramento nao tem configuracao suficiente', async () => {
    mockGetCryptoDatabaseUsage.mockResolvedValue(undefined)

    await job.run()

    expect(mockBroadcastDiscord).not.toHaveBeenCalled()
    expect(mockCleanupCryptoDatabase).not.toHaveBeenCalled()
  })

  it('alerta falha e propaga erro quando a limpeza falha', async () => {
    const error = new Error('mongo caiu')
    mockGetCryptoDatabaseUsage.mockResolvedValue({
      databaseName: 'crypto',
      usedBytes: 850,
      limitBytes: 1000,
      usagePercent: 85,
    })
    mockCleanupCryptoDatabase.mockRejectedValue(error)

    await expect(job.run()).rejects.toThrow('mongo caiu')

    expect(mockBroadcastDiscord).toHaveBeenCalledWith(expect.stringContaining('Falha na limpeza automática'))
  })
})
