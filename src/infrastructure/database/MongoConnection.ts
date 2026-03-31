import { MongoClient, Db, Collection, Document } from 'mongodb'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoConnection')

const DATABASE = 'agiobot'

/**
 * Singleton que gerencia a conexão com o MongoDB.
 *
 * Uso:
 *   await MongoConnection.connect(mongoUrl)
 *   const db = MongoConnection.getDb()
 *   const col = MongoConnection.getCollection('data')
 */
export class MongoConnection {
  private static client: MongoClient | null = null
  private static db: Db | null = null

  static async connect(mongoUrl: string): Promise<void> {
    if (MongoConnection.db) return // já conectado

    const client = new MongoClient(mongoUrl)
    await client.connect()
    MongoConnection.client = client
    MongoConnection.db = client.db(DATABASE)
    log.info('MongoDB conectado')
  }

  static getDb(): Db {
    if (!MongoConnection.db) {
      throw new Error('MongoDB não está conectado. Chame MongoConnection.connect() primeiro.')
    }
    return MongoConnection.db
  }

  static getCollection<T extends Document = Document>(name: string): Collection<T> {
    return MongoConnection.getDb().collection<T>(name)
  }

  static async disconnect(): Promise<void> {
    if (MongoConnection.client) {
      await MongoConnection.client.close()
      MongoConnection.client = null
      MongoConnection.db = null
      log.info('MongoDB desconectado')
    }
  }

  /** Verifica se a conexão está ativa — útil para health checks. */
  static isConnected(): boolean {
    return MongoConnection.db !== null
  }
}
