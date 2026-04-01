import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([]).rest(z.string())

/**
 * $up
 * Mostra o último empréstimo pendente do usuário.
 */
export class UltimoEmprestimoCommand extends BaseCommand<typeof schema> {
  readonly name = 'up'
  readonly description = 'Mostra o último empréstimo pendente'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get caixinhaService() { return require('../../../services/CaixinhaService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    const { author } = message as any
    const data = await this.caixinhaService.getInfoUltimoEmprestimo(author.username)

    if (data.error) {
      await message.channel.send(data.error)
      return
    }

    await message.channel.send(data.text)
    await message.channel.send(data.link)
  }

  protected getUsage() { return '`$up`' }
}
