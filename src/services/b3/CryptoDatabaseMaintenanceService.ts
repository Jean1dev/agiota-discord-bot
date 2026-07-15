import { MongoClient } from 'mongodb'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'
import { getKeycloakToken } from '../auth/KeycloakService'
import { migrateCollections } from '../subscription/SubscriptionService'

const log = createLogger('CryptoDatabaseMaintenanceService')

export const CRYPTO_DATABASE_NAME = 'crypto'
export const CRYPTO_DATABASE_COLLECTION_WHITELIST = new Set(['releases'])

type MongoDbStats = {
  dataSize?: number
  storageSize?: number
  indexSize?: number
  totalSize?: number
}

export type CryptoDatabaseUsage = {
  databaseName: string
  usedBytes: number
  limitBytes: number
  usagePercent: number
}

export type CryptoDatabaseCleanupResult = {
  databaseName: string
  migrationMessage: string
  migratedDocuments: number
  droppedCollections: string[]
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function getUsedBytesFromStats(stats: MongoDbStats): number {
  if (isPositiveNumber(stats.totalSize)) return stats.totalSize

  const storageSize = isPositiveNumber(stats.storageSize) ? stats.storageSize : 0
  const indexSize = isPositiveNumber(stats.indexSize) ? stats.indexSize : 0
  const storageWithIndexes = storageSize + indexSize
  if (storageWithIndexes > 0) return storageWithIndexes

  return isPositiveNumber(stats.dataSize) ? stats.dataSize : 0
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

function getCryptoDatabaseConfig(): { dbUrl: string; limitBytes: number } | undefined {
  const dbUrl = env.CRYPTO_SERVICE_DB?.trim()
  const limitBytes = env.CRYPTO_DB_STORAGE_LIMIT_BYTES

  if (!dbUrl || !isPositiveNumber(limitBytes)) return undefined

  return { dbUrl, limitBytes }
}

export async function getCryptoDatabaseUsage(): Promise<CryptoDatabaseUsage | undefined> {
  const config = getCryptoDatabaseConfig()
  if (!config) {
    log.warn('CRYPTO_SERVICE_DB ou CRYPTO_DB_STORAGE_LIMIT_BYTES ausente; monitoramento do banco crypto ignorado')
    return undefined
  }

  const client = new MongoClient(config.dbUrl)

  try {
    await client.connect()
    const db = client.db(CRYPTO_DATABASE_NAME)
    const stats = await db.stats() as MongoDbStats
    const usedBytes = getUsedBytesFromStats(stats)

    return {
      databaseName: CRYPTO_DATABASE_NAME,
      usedBytes,
      limitBytes: config.limitBytes,
      usagePercent: (usedBytes / config.limitBytes) * 100,
    }
  } finally {
    await client.close()
  }
}

export async function cleanupCryptoDatabase(): Promise<CryptoDatabaseCleanupResult> {
  const config = getCryptoDatabaseConfig()
  if (!config) {
    throw new Error('CRYPTO_SERVICE_DB ou CRYPTO_DB_STORAGE_LIMIT_BYTES nao configurado')
  }

  const token = await getKeycloakToken()
  const migration = await migrateCollections(token)
  const client = new MongoClient(config.dbUrl)
  const droppedCollections: string[] = []

  try {
    await client.connect()
    const db = client.db(CRYPTO_DATABASE_NAME)
    const collections = await db.listCollections().toArray() as Array<{ name: string }>

    for (const collection of collections) {
      if (CRYPTO_DATABASE_COLLECTION_WHITELIST.has(collection.name)) continue

      await db.collection(collection.name).drop()
      droppedCollections.push(collection.name)
    }

    log.info({ droppedCollections }, 'Limpeza do banco crypto concluida')
    return {
      databaseName: CRYPTO_DATABASE_NAME,
      migrationMessage: migration.message,
      migratedDocuments: migration.total,
      droppedCollections,
    }
  } finally {
    await client.close()
  }
}
