const axios = require('axios').default
const qs = require('querystring')
const { requireAdmin } = require("../guard-handler");
const { ADMIN_KC_CLIENT_ID, ADMIN_KC_USERNAME, ADMIN_KC_PASSWORD } = require('../../config');
const sendEmail = require('../../services/EmailService');
const captureException = require('../../observability/Sentry');

function notifySuccessWithEmail(email) {
    sendEmail({
        subject: `Assinatura ativa`,
        message: `Ola! este email confirma que sua assinatura esta ativa, se tiver alguma duvida pode entrar em contato comigo`,
        to: email
    })
}

function sendEmailBoasVindas(email) {
    sendEmail({
        subject: `Acesso software de arbitragem`,
        message: `Fala mestre tudo bem, liberei o acesso ao software de arbitragem, estamos liberando novas features 

                    Se tiver alguma opinião/comentário pode me acionar, o link do nosso grupo do WhatsApp https://chat.whatsapp.com/Fyd8t4sXknGHgxlPaaYzKB o grupo do Telegram tem o link na plataforma 


                    Abraço e bons investimentos `,
        to: email
    })
}

function handler(args, discordMessage) {
    const email = String(args[0])

    const data = qs.stringify({
        grant_type: 'password',
        client_id: ADMIN_KC_CLIENT_ID,
        username: ADMIN_KC_USERNAME,
        password: ADMIN_KC_PASSWORD
    });

    let config = {
        method: 'post',
        url: 'https://lemur-5.cloud-iam.com/auth/realms/caixinha-auth-server/protocol/openid-connect/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    };

    axios.request(config)
        .then((response) => {
            const token = response.data.access_token
            discordMessage.reply('Acesso autorizado pelo Keycloack')

            config = {
                method: 'post',
                url: 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com/plano',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: {
                    email,
                    periodoPlano: "MENSAL"
                }
            };

            axios.request(config)
                .then((response) => {
                    discordMessage.reply(`Status ${response.status} para criacao do plano`)
                    notifySuccessWithEmail(email)
                    setTimeout(() => {
                        sendEmailBoasVindas(email)
                    }, 1000 * 60 * 45)
                })
                .catch((error) => {
                    if (error.isAxiosError) {
                        discordMessage.reply(`Erro ao criar plano: ${error.response.data.message}`)
                        return
                    }

                    captureException(error)
                    discordMessage.reply(`Erro ao criar o plano ${error.message}`)
                })
        })
        .catch((error) => {
            captureException(error)
            discordMessage.reply('Erro ao buscar o token')
        })
}

module.exports = (args, message) => requireAdmin(args, message, handler)