import { IJob } from '../IJob'
import { CHAT_GERAL, CANAIS_PARA_LIMPAR } from '../../discord-constants'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rankearUso, rotinaDiariaCrypto } = require('../../services')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextInstance } = require('../../context')

/**
 * Runs daily at 23:10.
 * - Clears Discord channels
 * - Ranks user activity
 * - Runs daily crypto routine
 */
export class MidnightJob implements IJob {
  readonly cronExpression = '10 23 * * *'

  async run(): Promise<void> {
    this.limparCanais()
    rankearUso()
    rotinaDiariaCrypto()
  }

  private limparCanais(): void {
    const context = contextInstance()
    let channel = context.client.channels.cache.find(
      (ch: { name: string }) => ch.name === CHAT_GERAL
    )
    channel.send('Iniciando tarefa agendada para limpar o canal 🤖').then((msg: { delete: (opts: { timeout: number }) => void }) => {
      msg.delete({ timeout: 60000 })
    })

    for (const channelName of CANAIS_PARA_LIMPAR) {
      channel = context.client.channels.cache.find(
        (ch: { name: string }) => ch.name === channelName
      )
      channel.bulkDelete(30)
        .then((messages: { size: number }) => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
        .catch((reason: unknown) => console.log(reason))
    }
  }
}
