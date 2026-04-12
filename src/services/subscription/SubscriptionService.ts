import axios from 'axios'
import appConfig from '../../config'
import { contextInstance } from '../../context'
import { getKeycloakToken } from '../auth/KeycloakService'
import { sendEmail } from '../email/EmailService'
import captureException from '../../observability/Sentry'
import { LIXO_CHANNEL } from '../../discord/DiscordConstants'
import { startAutomateAfterNewSubscription } from '../b3/AutoArbitrageService'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('SubscriptionService')

async function migrateCollections(token: string): Promise<{ message: string; total: number }> {
    const config = {
        method: 'post',
        url: 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com/migration/user-confirmations',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }

    const { data } = await axios.request(config)
    return {
        message: data.message,
        total: data.migratedDocuments
    }
}

async function createSubscriptionPlan(email: string, token: string): Promise<any> {
    const config = {
        method: 'post',
        url: 'https://o-auth-managment-server-6d5834301f7a.herokuapp.com/plano',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        data: {
            email,
            periodoPlano: 'MENSAL'
        }
    }

    return axios.request(config)
}

export function notifySms(fone: string): Promise<any> {
    const body = {
        desc: 'Assinatura ativa no software de arbitragem',
        recipients: [fone],
    }

    return axios.post(`${appConfig.COMMUNICATION_SERVER_URL}/notificacao/sms`, body)
}

export function notifySuccessWithEmail(email: string): void {
    sendEmail({
        subject: 'Assinatura ativa',
        body: `Ola! este email confirma que sua assinatura esta ativa, se tiver alguma duvida pode entrar em contato comigo
        *Informações*
                    • [Documentação](https://docs.arbitragem-crypto.cloud/introduction)
                    • [Site](https://market.arbitragem-crypto.cloud/)
                    • [Plataforma](https://arbitragem-crypto.cloud/)
                    • [Comunidade](https://comunidade.arbitragem-crypto.cloud/)
        `,
        to: email
    })
}

export function sendEmailBoasVindas(email: string): void {
    sendEmail({
        subject: 'Acesso software de arbitragem',
        body: `Fala mestre tudo bem, liberei o acesso ao software de arbitragem, estamos liberando novas features

                    Se tiver alguma opinião/comentário pode me acionar, o link do nosso grupo do WhatsApp https://chat.whatsapp.com/Fyd8t4sXknGHgxlPaaYzKB o grupo do Telegram tem o link na plataforma


                    Abraço e bons investimentos `,
        to: email
    })
}

export async function createSubscription(
    email: string,
    fone: string | null
): Promise<{ success: boolean; status: number }> {
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
    } catch (error: any) {
        if (error.isAxiosError) {
            throw new Error(error.response.data.message)
        }
        captureException(error)
        throw error
    }
}

export async function getActiveSubscriptions(): Promise<{
    totalActive: number
    expiringSoon: Array<{ email: string; expiresAt: string; expiresIn: string }>
}> {
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

        const activePlans = plans.filter((plan: any) => {
            const vigenciaAte = new Date(plan.vigenteAte)
            return vigenciaAte >= today
        })

        const expiringSoon = activePlans.filter((plan: any) => {
            const vigenciaAte = new Date(plan.vigenteAte)
            return vigenciaAte <= sixDaysFromNow
        })

        return {
            totalActive: activePlans.length,
            expiringSoon: expiringSoon.map((plan: any) => {
                const expiresAt = new Date(plan.vigenteAte)
                const diffTime = expiresAt.getTime() - today.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return {
                    email: plan.email.split('@')[0],
                    expiresAt: plan.vigenteAte,
                    expiresIn: `Vence em ${diffDays} dias`
                }
            })
        }
    } catch (error: any) {
        if (error.isAxiosError) {
            throw new Error(error.response.data.message)
        }
        captureException(error)
        throw error
    }
}

export async function addSubcriptionByEvent(event: any): Promise<void> {
    const { name, email, product, status } = event

    await createSubscription(email, null)
    const channel: any = contextInstance().client.channels.cache.find(
        (ch: any) => ch.name === LIXO_CHANNEL,
    )
    if (!channel) return
    channel.send(`Novo plano de assinatura: ${product} - ${status} - ${name} - ${email}`)

    startAutomateAfterNewSubscription()
    channel.send('Iniciando arbitragem após nova assinatura')
}

function getCancellationEmailTemplate(name: string): string {
    return `
    Olá ${name}, tudo bem?

    Notamos que você cancelou sua assinatura recentemente. Estamos constantemente trabalhando para oferecer o melhor produto do mercado e sua opinião é muito importante para nós.

    Se puder, gostaríamos de saber o que motivou essa decisão e como podemos melhorar. Fique à vontade para responder a este e-mail, caso queira compartilhar sua experiência.

    Agradecemos desde já pelo seu tempo!

    Atenciosamente,

    Equipe Arbitragem Crypto
    `
}

async function cancelSubscription(email: string): Promise<void> {
    const token = await getKeycloakToken()
    const config = {
        method: 'post',
        url: `https://o-auth-managment-server-6d5834301f7a.herokuapp.com/plano/reembolso?email=${encodeURIComponent(email)}`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }

    await axios.request(config)
    log.info({ email }, 'Assinatura cancelada com sucesso')
}

function sendCancellationEmail(name: string, email: string): void {
    const message = getCancellationEmailTemplate(name)
    sendEmail({ subject: 'Assinatura cancelada', body: message, to: email })
}

function notifyDiscordCancellation(name: string, email: string): void {
    const channel: any = contextInstance().client.channels.cache.find(
        (ch: any) => ch.name === LIXO_CHANNEL,
    )
    if (channel) {
        channel.send(`🚫 Protesto registrado e assinatura cancelada para: ${name} (${email})`)
    }
}

export async function addProtestByEvent(event: any): Promise<void> {
    const { name, email } = event

    try {
        sendCancellationEmail(name, email)
        await cancelSubscription(email)
        notifyDiscordCancellation(name, email)
    } catch (error: any) {
        log.error({ err: error, email }, 'Erro ao cancelar assinatura')
        captureException(error)
    }
}

export { migrateCollections }
