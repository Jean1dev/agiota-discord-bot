const { requireAdmin } = require('../guard-handler')
const sendEmail = require('../../services/EmailService')
const captureException = require('../../observability/Sentry')
const MeConecteiService = require('../../services/MeConecteiService')

async function handle(args, message) {
  try {
    if (!args.length) {
      return message.reply('❌ Por favor, informe o email como parâmetro')
    }

    const email = args[0].trim()
    if (!email.includes('@')) {
      return message.reply('❌ Email inválido')
    }

    await message.reply('🔄 Criando conta de admin no me-conectei...')

    const password = MeConecteiService.generatePassword(12)
    await MeConecteiService.createAdminUser(email, password)

    const emailMessage = `Olá!

Sua conta de administrador foi criada no me-conectei.

Email: ${email}
Senha: ${password}

Por favor, altere sua senha após o primeiro login.

Atenciosamente,
Bot Discord`

    sendEmail({
      to: email,
      subject: 'Conta criada no me-conectei',
      message: emailMessage
    })

    await message.reply(`✅ Conta criada com sucesso!\n\n📧 Email: ${email}\n🔑 Senha: ${password}\n\n📨 Email de confirmação enviado!`)
  } catch (error) {
    console.error('Erro no comando meconectei:', error)
    captureException(error)
    if (error.response) {
      await message.reply(`❌ Erro ao criar conta: ${error.response.status} - ${error.response.data?.message || error.message}`)
    } else {
      await message.reply(`❌ Erro ao criar conta: ${error.message}`)
    }
  }
}

module.exports = (args, message) => requireAdmin(args, message, handle)
