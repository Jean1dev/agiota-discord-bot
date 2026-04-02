import { MongoClient } from 'mongodb'
import { z } from 'zod'
import { env } from '../../../config/env'
import { getKeycloakToken } from '../../../services/auth/KeycloakService'
import { migrateCollections } from '../../../services/subscription/SubscriptionService'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('DbCleanCommand')
const schema = z.tuple([]).rest(z.string())

/**
 * $db-clean (admin only)
 * Executa migração de coleções e limpa o banco crypto.
 */
export class DbCleanCommand extends BaseCommand<typeof schema> {
  readonly name = 'db-clean'
  readonly description = 'Executa migração e limpa o banco crypto (apenas admin)'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Iniciando limpeza do banco de dados...')

    const token: string = await getKeycloakToken()
    await message.reply('Token obtido.')

    const result = await migrateCollections(token)
    await message.reply(`Migração concluída: ${result.message} (${result.total} docs)`)

    const dbUrl = env.CRYPTO_SERVICE_DB
    if (!dbUrl) {
      await message.reply('CRYPTO_SERVICE_DB não configurado; pulando limpeza do banco crypto.')
      log.warn('db-clean: CRYPTO_SERVICE_DB ausente')
      return
    }

    const cryptoClient = new MongoClient(dbUrl)
    await cryptoClient.connect()

    const db = cryptoClient.db('crypto')
    const collections = await db.listCollections().toArray() as Array<{ name: string }>
    const whitelist = new Set(['releases'])

    for (const col of collections) {
      if (!whitelist.has(col.name)) {
        await db.collection(col.name).drop()
      }
    }

    await cryptoClient.close()
    log.info('db-clean concluído com sucesso')
    await message.reply('Limpeza concluída com sucesso!')
  }

  protected getUsage() { return '`$db-clean`' }
}
