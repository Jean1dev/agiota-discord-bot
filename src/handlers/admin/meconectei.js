const { requireAdmin } = require('../guard-handler')
const axios = require('axios')
const sendEmail = require('../../services/EmailService')
const captureException = require('../../observability/Sentry')

function generatePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const allChars = uppercase + lowercase + numbers
    
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function handle(args, message) {
    try {
        if (!args.length) {
            return message.reply('❌ Por favor, informe o email como parâmetro')
        }

        const email = args[0]
        
        if (!email.includes('@')) {
            return message.reply('❌ Email inválido')
        }

        message.reply('🔄 Criando conta de admin no me-conectei...')

        const password = generatePassword(12)

        const response = await axios.post(
            'https://me-conectei-svc-temp-4f6577936f24.herokuapp.com/admin/createAdminUser',
            {
                email: email,
                password: password
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )

        if (response.status === 200 || response.status === 201) {
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

            message.reply(`✅ Conta criada com sucesso!\n\n📧 Email: ${email}\n🔑 Senha: ${password}\n\n📨 Email de confirmação enviado!`)
        } else {
            message.reply(`❌ Erro ao criar conta. Status: ${response.status}`)
        }

    } catch (error) {
        console.error('Erro no comando meconectei:', error)
        captureException(error)
        
        if (error.response) {
            message.reply(`❌ Erro ao criar conta: ${error.response.status} - ${error.response.data?.message || error.message}`)
        } else {
            message.reply(`❌ Erro ao criar conta: ${error.message}`)
        }
    }
}

module.exports = (args, message) => requireAdmin(args, message, handle)

