import { z } from 'zod'
import { sendEmail } from '../../../services/email/EmailService'
import { createAdminUser, generatePassword } from '../../../services/meconectei/MeConecteiService'
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

  protected async handle(message: DiscordMessage, [email]: z.infer<typeof schema>): Promise<void> {
    await message.reply('Criando conta de admin no Me Conectei...')

    const password: string = generatePassword(12)
    await createAdminUser(email, password)

    sendEmail({
      to: email,
      subject: 'Conta criada no me-conectei',
      message: `Sua conta foi criada.\nEmail: ${email}\nSenha: ${password}\n\nAlgere sua senha após o primeiro login.`,
    })

    log.info({ email }, 'Conta Me Conectei criada')
    await message.reply(`Conta criada!\nE-mail: ${email}\nSenha: ${password}\n\nE-mail de confirmação enviado.`)
  }

  protected getUsage() { return '`$meconectei <email>`' }
}
