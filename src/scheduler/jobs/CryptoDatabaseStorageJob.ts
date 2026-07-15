import { IJob } from '../IJob'
import { broadcastDiscord } from '../../services/discord/BroadcastService'
import { createLogger } from '../../shared/logger/Logger'
import {
  cleanupCryptoDatabase,
  CryptoDatabaseUsage,
  formatBytes,
  getCryptoDatabaseUsage,
} from '../../services/b3/CryptoDatabaseMaintenanceService'

const log = createLogger('CryptoDatabaseStorageJob')
const WARNING_THRESHOLD_PERCENT = 50
const CLEANUP_THRESHOLD_PERCENT = 80

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatUsage(usage: CryptoDatabaseUsage): string {
  return `${formatBytes(usage.usedBytes)} de ${formatBytes(usage.limitBytes)} (${formatPercent(usage.usagePercent)})`
}

export class CryptoDatabaseStorageJob implements IJob {
  readonly cronExpression = '*/30 * * * *'

  async run(): Promise<void> {
    const usage = await getCryptoDatabaseUsage()
    if (!usage) return

    log.info({
      databaseName: usage.databaseName,
      usedBytes: usage.usedBytes,
      limitBytes: usage.limitBytes,
      usagePercent: usage.usagePercent,
    }, 'Uso do banco crypto verificado')

    if (usage.usagePercent < WARNING_THRESHOLD_PERCENT) return

    if (usage.usagePercent <= CLEANUP_THRESHOLD_PERCENT) {
      broadcastDiscord(`⚠️ Banco ${usage.databaseName} usando ${formatUsage(usage)} do storage configurado.`)
      return
    }

    broadcastDiscord(`🔴 Banco ${usage.databaseName} passou de ${CLEANUP_THRESHOLD_PERCENT}% do storage (${formatUsage(usage)}). Iniciando limpeza automática.`)

    try {
      const cleanup = await cleanupCryptoDatabase()
      broadcastDiscord(
        `✅ Limpeza automática do banco ${cleanup.databaseName} concluída. ` +
        `${cleanup.droppedCollections.length} coleções removidas; migração: ${cleanup.migrationMessage} (${cleanup.migratedDocuments} docs).`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'erro desconhecido'
      log.error({ err }, 'Falha na limpeza automatica do banco crypto')
      broadcastDiscord(`🔴 Falha na limpeza automática do banco ${usage.databaseName}: ${message}`)
      throw err
    }
  }
}
