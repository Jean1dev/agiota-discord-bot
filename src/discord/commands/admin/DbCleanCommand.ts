import { z } from 'zod'
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

  // Importa serviços JS existentes
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly keycloakService = require('../../../services/KeycloakService')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly subscriptionService = require('../../../services/SubscriptionService')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly config = require('../../../config')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly MongoClient = require('mongodb').MongoClient

  protected async handle(message: DiscordMessage): Promise<void> {
    await message.reply('Iniciando limpeza do banco de dados...')

    const token: string = await this.keycloakService.getKeycloakToken()
    await message.reply('Token obtido.')

    const result = await this.subscriptionService.migrateCollections(token) as { message: string; total: number }
    await message.reply(`Migração concluída: ${result.message} (${result.total} docs)`)

    const cryptoClient = new this.MongoClient(this.config.CRYPTO_SERVICE_DB as string)
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
