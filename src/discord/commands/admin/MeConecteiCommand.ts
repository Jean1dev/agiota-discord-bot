import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('MeConecteiCommand')

const schema = z.tuple([
  z.string().email('E-mail inválido'),
]).rest(z.string())

/**
 * $meconectei <email> (admin only)
 * Cria uma conta de admin no Me Conectei e envia credenciais por e-mail.
 */
export class MeConecteiCommand extends BaseCommand<typeof schema> {
  readonly name = 'meconectei'
  readonly description = 'Cria conta admin no Me Conectei :: $meconectei <email>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly meConecteiService = require('../../../services/MeConecteiService')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly emailService = require('../../../services/EmailService')

  protected async handle(message: DiscordMessage, [email]: z.infer<typeof schema>): Promise<void> {
    await message.reply('Criando conta de admin no Me Conectei...')

    const password: string = this.meConecteiService.generatePassword(12)
    await this.meConecteiService.createAdminUser(email, password)

    this.emailService.sendEmail({
      to: email,
      subject: 'Conta criada no me-conectei',
      body: `Sua conta foi criada.\nEmail: ${email}\nSenha: ${password}\n\nAlgere sua senha após o primeiro login.`,
    })

    log.info({ email }, 'Conta Me Conectei criada')
    await message.reply(`Conta criada!\nE-mail: ${email}\nSenha: ${password}\n\nE-mail de confirmação enviado.`)
  }

  protected getUsage() { return '`$meconectei <email>`' }
}
