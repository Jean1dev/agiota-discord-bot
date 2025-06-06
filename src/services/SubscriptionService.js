const { COMMUNICATION_SERVER_URL, ADMIN_KC_CLIENT_ID, ADMIN_KC_USERNAME, ADMIN_KC_PASSWORD } = require('../config')
const axios = require('axios').default
const qs = require('querystring')
const sendEmail = require('./EmailService')
const captureException = require('../observability/Sentry')

async function getKeycloakToken() {
    const data = qs.stringify({
        grant_type: 'password',
        client_id: ADMIN_KC_CLIENT_ID,
        username: ADMIN_KC_USERNAME,
        password: ADMIN_KC_PASSWORD
    })

    const config = {
        method: 'post',
        url: 'https://lemur-5.cloud-iam.com/auth/realms/caixinha-auth-server/protocol/openid-connect/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    }

    const response = await axios.request(config)
    return response.data.access_token
}

async function createSubscriptionPlan(email, token) {
    const config = {
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
    }

    const response = await axios.request(config)
    return response
}

function notifySms(fone) {
    const body = {
        desc: "Assinatura ativa no software de arbitragem",
        recipients: [fone],
    }

    return axios.post(`${COMMUNICATION_SERVER_URL}/notificacao/sms`, body)
}

function notifySuccessWithEmail(email) {
    return sendEmail({
        subject: `Assinatura ativa`,
        message: `Ola! este email confirma que sua assinatura esta ativa, se tiver alguma duvida pode entrar em contato comigo
        *Informações*
                    • [Documentação](https://docs.arbitragem-crypto.cloud/introduction)
                    • [Site](https://market.arbitragem-crypto.cloud/)
                    • [Plataforma](https://arbitragem-crypto.cloud/)
        `,
        to: email
    })
}

function sendEmailBoasVindas(email) {
    return sendEmail({
        subject: `Acesso software de arbitragem`,
        message: `Fala mestre tudo bem, liberei o acesso ao software de arbitragem, estamos liberando novas features 

                    Se tiver alguma opinião/comentário pode me acionar, o link do nosso grupo do WhatsApp https://chat.whatsapp.com/Fyd8t4sXknGHgxlPaaYzKB o grupo do Telegram tem o link na plataforma 


                    Abraço e bons investimentos `,
        to: email
    })
}

async function createSubscription(email, fone) {
    try {
        const token = await getKeycloakToken()
        const response = await createSubscriptionPlan(email, token)

        notifySuccessWithEmail(email)

        if (fone) {
            await notifySms(fone)
        }

        setTimeout(() => {
            sendEmailBoasVindas(email)
        }, 1000 * 60 * 15)

        return { success: true, status: response.status }
    } catch (error) {
        if (error.isAxiosError) {
            throw new Error(error.response.data.message)
        }
        captureException(error)
        throw error
    }
}

async function getActiveSubscriptions() {
    try {
        const token = await getKeycloakToken()
        const config = {
            method: 'get',
            url: 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com/plano',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }

        const response = await axios.request(config)
        const plans = response.data

        const today = new Date()
        const sixDaysFromNow = new Date()
        sixDaysFromNow.setDate(today.getDate() + 6)

        const activePlans = plans.filter(plan => {
            const vigenciaAte = new Date(plan.vigenteAte)
            return vigenciaAte >= today
        })

        const expiringSoon = activePlans.filter(plan => {
            const vigenciaAte = new Date(plan.vigenteAte)
            return vigenciaAte <= sixDaysFromNow
        })

        return {
            totalActive: activePlans.length,
            expiringSoon: expiringSoon.map(plan => {
                const expiresAt = new Date(plan.vigenteAte)
                const diffTime = expiresAt - today
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return {
                    email: plan.email.split('@')[0],
                    expiresAt: plan.vigenteAte,
                    expiresIn: `Vence em ${diffDays} dias`
                }
            })
        }
    } catch (error) {
        if (error.isAxiosError) {
            throw new Error(error.response.data.message)
        }
        captureException(error)
        throw error
    }
}

module.exports = {
    createSubscription,
    notifySms,
    notifySuccessWithEmail,
    sendEmailBoasVindas,
    getActiveSubscriptions
} 