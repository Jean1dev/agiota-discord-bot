import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { ListDebtsUseCase } from '../../../application/debt/ListDebtsUseCase'
import { createLogger } from '../../../shared/logger/Logger'
import axios from 'axios'
import { env } from '../../../config/env'

const log = createLogger('ChargeDebtsCommand')

// Sem argumentos
const schema = z.tuple([]).rest(z.string())

/**
 * $cobrar
 *
 * Lista todas as dívidas em aberto (locais + Caixinha).
 */
export class ChargeDebtsCommand extends BaseCommand<typeof schema> {
  readonly name = 'cobrar'
  readonly description = 'Lista os usuários que possuem débitos em aberto'
  protected readonly schema = schema

  constructor(private readonly listUseCase: ListDebtsUseCase) {
    super()
  }

  protected async handle(message: DiscordMessage): Promise<void> {
    // Busca externa à Caixinha em paralelo (fire-and-notify, sem bloquear)
    this.fetchCaixinhaDebts(message)

    const result = await this.listUseCase.execute()

    if (!result.ok) {
      await message.reply(`Erro ao buscar dívidas: ${result.error.message}`)
      return
    }

    const usersWithDebts = result.value

    if (usersWithDebts.length === 0) {
      await message.reply('Ninguém está te devendo, meu mano.')
      return
    }

    for (const user of usersWithDebts) {
      const debtLines = user.debts
        .map(d => `  • R$${d.value.toFixed(2)} — ${d.description || 'sem descrição'} (credor: ${d.lender})`)
        .join('\n')

      const paymentLines = user.payments.length > 0
        ? user.payments.map(p => `  • R$${p.value.toFixed(2)}`).join('\n')
        : '  • nenhum'

      await message.channel.send(
        `**Dívidas de ${user.userId}**\n` +
        `${debtLines}\n` +
        `**Pagamentos:**\n${paymentLines}\n` +
        `**Total em aberto: R$${user.totalOwed.toFixed(2)}**`,
      )
    }
  }

  private fetchCaixinhaDebts(message: DiscordMessage): void {
    if (!env.CAIXINHA_SERVER_URL) return

    const url = `${env.CAIXINHA_SERVER_URL}/report-dividas-pendentes?code=ZE1oGnOPHdf4QtEvPpILx97EPHvdjmpw9wbE9P4bvmr6AzFuIbaQtQ==`

    axios.get(url)
      .then(({ data }: { data: Array<{ report: Array<{ member: { name: string }; valuePending: { value: number } }> }> }) => {
        for (const item of data) {
          for (const divida of item.report) {
            const name = divida.member.name
            const value = divida.valuePending.value
            void message.channel.send(
              `${name} está devendo R$${value.toFixed(2)} para a caixinha — pague a conta!`,
            )
          }
        }
      })
      .catch(err => {
        log.warn({ err }, 'Falha ao buscar dívidas da Caixinha')
      })
  }

  protected getUsage(): string {
    return '`$cobrar`'
  }
}
