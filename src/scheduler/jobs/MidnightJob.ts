import { IJob } from '../IJob'
import { CHAT_GERAL, CANAIS_PARA_LIMPAR } from '../../discord/DiscordConstants'
import { contextInstance } from '../../context'
import { rankearUso, rotinaDiariaCrypto } from '../../services'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels = context.client.channels.cache as any
    const channel = channels.find((ch: any) => ch.name === CHAT_GERAL)
    channel?.send('Iniciando tarefa agendada para limpar o canal 🤖').then((msg: any) => {
      msg.delete({ timeout: 60000 })
    })

    for (const channelName of CANAIS_PARA_LIMPAR) {
      const ch = channels.find((c: any) => c.name === channelName)
      ch?.bulkDelete(30)
        .then((messages: any) => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
        .catch((reason: unknown) => console.log(reason))
    }
  }
}
