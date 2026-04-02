import { z } from 'zod'
import * as gameFunctions from '../../../handlers/jogo-bixo/game-functions'
import { BaseCommand, DiscordMessage } from '../BaseCommand'

const betNumberSchema = z.string()
  .regex(/^\d+$/, 'Número inválido — informe apenas dígitos')
  .transform(Number)
  .refine(n => n >= 0 && n <= 99, 'Número deve estar entre 0 e 99')

const schema = z.tuple([betNumberSchema]).rest(z.string().transform(Number))

/**
 * $bixo <número> [segundo_número]
 * Aposta no jogo do bixo.
 */
export class PlaceBetCommand extends BaseCommand<typeof schema> {
  readonly name = 'bixo'
  readonly description = 'Aposta em um bicho no jogo do bixo :: $bixo <número> [segundo_número]'
  protected readonly schema = schema

  protected async handle(message: DiscordMessage, [numero, ...rest]: z.infer<typeof schema>): Promise<void> {
    const segundoNumero = rest[0] ?? 0
    const aposta = { numero, segundoNumero, autor: message.author.id }

    const retorno = gameFunctions.registrarAposta(aposta)

    if (retorno.status) {
      await message.reply('Aposta realizada com sucesso!')
      return
    }

    await message.reply(retorno.message ?? 'Não foi possível registrar a aposta.')

    if (retorno.message === 'Não existe um jogo aberto') {
      await message.reply('Não se preocupe, vou criar um jogo e registrar sua aposta!')
      setTimeout(() => gameFunctions.criarNovoJogo(), 10_000)
      setTimeout(() => gameFunctions.registrarAposta(aposta), 15_000)
    }
  }

  protected getUsage() { return '`$bixo <0-99> [segundo_número]`' }
}
