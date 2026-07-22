const mockEnv: { CRYPTO_SERVICE_DB?: string; CRYPTO_DB_STORAGE_LIMIT_BYTES?: number } = {}

jest.mock('../../../../src/config/env', () => ({ env: mockEnv }))

const mockConnect = jest.fn()
const mockClose = jest.fn()
const mockStats = jest.fn()
const mockListCollectionsToArray = jest.fn()
const mockCollection = jest.fn()
const mockDb = jest.fn()
const mockMongoClientConstructor = jest.fn()

jest.mock('mongodb', () => ({
  MongoClient: mockMongoClientConstructor,
}))

const mockGetKeycloakToken = jest.fn()
jest.mock('../../../../src/services/auth/KeycloakService', () => ({
  getKeycloakToken: (...args: unknown[]) => mockGetKeycloakToken(...args),
}))

const mockMigrateCollections = jest.fn()
jest.mock('../../../../src/services/subscription/SubscriptionService', () => ({
  migrateCollections: (...args: unknown[]) => mockMigrateCollections(...args),
}))

jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

import {
  cleanupCryptoDatabase,
  getCryptoDatabaseUsage,
  getUsedBytesFromStats,
} from '../../../../src/services/b3/CryptoDatabaseMaintenanceService'

describe('CryptoDatabaseMaintenanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockEnv.CRYPTO_SERVICE_DB = 'mongodb://crypto-service'
    mockEnv.CRYPTO_DB_STORAGE_LIMIT_BYTES = 1000

    mockConnect.mockResolvedValue(undefined)
    mockClose.mockResolvedValue(undefined)
    mockStats.mockResolvedValue({ dataSize: 650, totalSize: 400, storageSize: 350, indexSize: 50 })
    mockListCollectionsToArray.mockResolvedValue([])
    mockCollection.mockReset()

    mockDb.mockReturnValue({
      stats: mockStats,
      listCollections: () => ({ toArray: mockListCollectionsToArray }),
      collection: mockCollection,
    })

    mockMongoClientConstructor.mockImplementation(() => ({
      connect: mockConnect,
      close: mockClose,
      db: mockDb,
    }))

    mockGetKeycloakToken.mockResolvedValue('keycloak-token')
    mockMigrateCollections.mockResolvedValue({ message: 'migrado', total: 12 })
  })

  it('calcula uso do banco crypto usando dataSize e o limite configurado', async () => {
    const usage = await getCryptoDatabaseUsage()

    expect(mockMongoClientConstructor).toHaveBeenCalledWith('mongodb://crypto-service')
    expect(mockDb).toHaveBeenCalledWith('crypto')
    expect(usage).toEqual({
      databaseName: 'crypto',
      usedBytes: 650,
      limitBytes: 1000,
      usagePercent: 65,
    })
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('ignora monitoramento quando a configuracao do banco esta ausente', async () => {
    delete mockEnv.CRYPTO_SERVICE_DB

    await expect(getCryptoDatabaseUsage()).resolves.toBeUndefined()

    expect(mockMongoClientConstructor).not.toHaveBeenCalled()
  })

  it('prioriza dataSize sobre storageSize e totalSize', () => {
    expect(getUsedBytesFromStats({ dataSize: 517, totalSize: 85, storageSize: 80, indexSize: 5 })).toBe(517)
  })

  it('usa totalSize quando dataSize nao esta disponivel', () => {
    expect(getUsedBytesFromStats({ totalSize: 650, storageSize: 500, indexSize: 25 })).toBe(650)
  })

  it('usa storageSize mais indexSize quando dataSize e totalSize nao estao disponiveis', () => {
    expect(getUsedBytesFromStats({ storageSize: 500, indexSize: 25 })).toBe(525)
  })

  it('executa migracao e limpa colecoes fora da whitelist', async () => {
    mockListCollectionsToArray.mockResolvedValue([
      { name: 'releases' },
      { name: 'orders' },
      { name: 'quotes' },
    ])

    const drops = new Map<string, jest.Mock>()
    mockCollection.mockImplementation((name: string) => {
      const drop = jest.fn().mockResolvedValue(undefined)
      drops.set(name, drop)
      return { drop }
    })

    const result = await cleanupCryptoDatabase()

    expect(mockGetKeycloakToken).toHaveBeenCalledTimes(1)
    expect(mockMigrateCollections).toHaveBeenCalledWith('keycloak-token')
    expect(mockDb).toHaveBeenCalledWith('crypto')
    expect(mockCollection).not.toHaveBeenCalledWith('releases')
    expect(mockCollection).toHaveBeenCalledWith('orders')
    expect(mockCollection).toHaveBeenCalledWith('quotes')
    expect(drops.get('orders')).toHaveBeenCalledTimes(1)
    expect(drops.get('quotes')).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      databaseName: 'crypto',
      migrationMessage: 'migrado',
      migratedDocuments: 12,
      droppedCollections: ['orders', 'quotes'],
    })
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
