import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([]).rest(z.string())

/**
 * $imgur
 * Envia 5 imagens aleatórias do Picsum.
 */
export class ImgurCommand extends BaseCommand<typeof schema> {
  readonly name = 'imgur'
  readonly description = 'Busca 5 imagens aleatórias'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage): Promise<void> {
    const links = Array.from(
      { length: 5 },
      (_, i) => `https://picsum.photos/seed/${Date.now()}${i}/600/400`
    )

    for (let i = 0; i < links.length; i++) {
      setTimeout(() => message.channel.send(links[i]!), i * 1000)
    }
  }

  protected getUsage() { return '`$imgur`' }
}
