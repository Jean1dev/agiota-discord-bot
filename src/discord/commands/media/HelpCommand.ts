import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { MessageEmbed } from 'discord.js'

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const comandos: Array<{ comando: string; descricao: string }> = require('../../../commands/comandos-struct')

    const embeds = comandos.map(cmd =>
      new MessageEmbed()
        .setTitle(cmd.comando)
        .setDescription(cmd.descricao)
        .setColor('RANDOM')
    )

    if (embeds.length > this.LIMITE_EMBEDS_DISCORD) {
      let counter = 0
      let batch: MessageEmbed[] = []

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
