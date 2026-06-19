import { z } from 'zod'
import { EmbedBuilder } from 'discord.js'
import comandos from '../../../commands/comandos-struct'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const schema = z.tuple([]).rest(z.string())

/**
 * $help
 * Lista todos os comandos disponíveis via DM.
 */
export class HelpCommand extends BaseCommand<typeof schema> {
  readonly name = 'help'
  readonly description = 'Lista os comandos disponíveis'
  protected readonly schema = schema

  private readonly LIMITE_EMBEDS_DISCORD = 10

  protected async handle(message: DiscordMessage): Promise<void> {
    const embeds = comandos.map(cmd =>
      new EmbedBuilder()
        .setTitle(cmd.comando)
        .setDescription(cmd.descricao)
        .setColor('Random')
    )

    if (embeds.length > this.LIMITE_EMBEDS_DISCORD) {
      let counter = 0
      let batch: EmbedBuilder[] = []

      for (const embed of embeds) {
        counter++
        if (counter === this.LIMITE_EMBEDS_DISCORD) {
          await message.author.send({ embeds: batch } as any)
          batch = []
          counter = 0
        }
        batch.push(embed)
      }

      if (batch.length) {
        await message.author.send({ embeds: batch } as any)
      }
      return
    }

    await message.author.send({ embeds } as any)
  }

  protected getUsage() { return '`$help`' }
}
