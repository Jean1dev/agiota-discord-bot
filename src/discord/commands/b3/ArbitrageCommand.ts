import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([
  z.string()
    .regex(/^\d+$/, 'Quantidade deve ser um número inteiro positivo')
    .transform(Number)
    .refine(n => n > 0 && n <= 100, 'Quantidade deve ser entre 1 e 100'),
]).rest(z.string())

/**
 * $arb <quantidade>
 * Executa N rounds de arbitragem.
 */
export class ArbitrageCommand extends BaseCommand<typeof schema> {
  readonly name = 'arb'
  readonly description = 'Verifica oportunidades de arbitragem :: $arb <quantidade>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly cryptoService = require('../../../services/cryptoArbitrageService')

  protected async handle(message: DiscordMessage, [quantities]: z.infer<typeof schema>): Promise<void> {
    this.cryptoService.forceArbitrage(quantities, (response: string) => {
      void message.reply(response)
    })
  }

  protected getUsage() { return '`$arb <quantidade_execucoes>`' }
}
