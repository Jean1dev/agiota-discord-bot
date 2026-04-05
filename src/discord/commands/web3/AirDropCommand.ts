import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('AirDropCommand')

const schema = z.tuple([
  z.string().transform(Number).refine(n => !isNaN(n) && n > 0, 'SOL inválido'),
  z.string().min(1, 'Chave pública obrigatória'),
  z.string().min(1, 'Cluster obrigatório'),
]).rest(z.string())

const MAX_RETRIES = 125

/**
 * $ad <sols> <pubKey> <cluster>
 * Solicita airdrop de SOL.
 */
export class AirDropCommand extends BaseCommand<typeof schema> {
  readonly name = 'ad'
  readonly description = 'Airdrop de SOL :: $ad <valor> <carteira> <cluster>'
  protected readonly schema = schema

  private tryAirdrop(
    sols: number,
    pubKey: string,
    net: string,
    maxRetries: number,
    message: DiscordMessage
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestAirDrop } = require('web3-client-lib/dist/src/solana/index.js')

    const deleteAfter = (msg: any) => setTimeout(() => msg.delete?.(), 25000)

    requestAirDrop(sols, pubKey, net)
      .then((result: any) => {
        if (result.error) {
          this.handleRetry(sols, pubKey, net, maxRetries, message, result, deleteAfter)
          return
        }
        message.reply('Airdrop realizado com sucesso')
      })
      .catch((error: any) => {
        log.warn({ err: error }, 'Airdrop error')
        this.handleRetry(sols, pubKey, net, maxRetries, message, error, deleteAfter)
      })
  }

  private handleRetry(
    sols: number,
    pubKey: string,
    net: string,
    maxRetries: number,
    message: DiscordMessage,
    result: any,
    deleteAfter: (msg: any) => void
  ): void {
    if (maxRetries > 0) {
      const remaining = maxRetries - 1
      message.channel
        .send(`Tentando novamente, tentativas restantes: ${remaining}`)
        .then(deleteAfter)
      setTimeout(() => this.tryAirdrop(sols, pubKey, net, remaining, message), 15000)
    } else {
      message.reply(result?.errorDetails?.message || 'Erro ao realizar airdrop')
      message.channel.send(`Try https://solfaucet.com/ pubKey ${result.pubKey}`)
    }
  }

  protected async handle(
    message: DiscordMessage,
    [sols, pubKey, net]: z.infer<typeof schema>
  ): Promise<void> {
    this.tryAirdrop(sols, pubKey, net, MAX_RETRIES, message)
  }

  protected getUsage() { return '`$ad <sols> <pubKey> <cluster>`' }
}
