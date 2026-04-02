import axios from 'axios'
import { contextInstance } from '../../context'
import { enviarAlertaParaUsuario } from '../../telegram/handlers/PublicHandler'
import { sendEmail } from '../email/EmailService'

const URLS = {
    primary: 'https://crypto-svc-eur-0e4c4365b070.herokuapp.com',
    backup: 'https://crypto-svc-e108728a6a2f.herokuapp.com'
}

let currentUrl = URLS.primary
const GROUP_ID = -1002156828677

async function makeRequest(
    method: string,
    endpoint: string,
    data: any = null,
    options: Record<string, any> = {}
): Promise<any> {
    console.log(method, ' . . ', `${currentUrl}${endpoint}`)

    const config: Record<string, any> = {
        method,
        url: `${currentUrl}${endpoint}`,
        timeout: options.timeout || 10000,
        ...options
    }

    if (data) {
        config.data = data
    }

    try {
        const response = await axios(config)
        return response
    } catch (error: any) {
        if (error.response?.status === 503 && currentUrl === URLS.primary) {
            console.log('Erro 503 detectado, trocando para URL reserva')
            currentUrl = URLS.backup
            return makeRequest(method, endpoint, data, options)
        }
        throw error
    }
}

function forceFutureArbitrage(): void {
    setTimeout(async () => {
        try {
            const response = await makeRequest('POST', '/v1/arbitrage/future')
            console.log(response.data)
        } catch (error) {
            console.log(error)
        }
    }, 7000)
}

export async function futureCrossingCounts(data: any = null): Promise<any> {
    const response = await makeRequest('POST', '/v1/arbitrage/future/crossing-counts', data)
    return response
}

let pendingArbitrageCount = 0
let arbitrageIntervalId: ReturnType<typeof setInterval> | null = null
let lastArbitrageCallback: ((msg: string) => void) | null = null
let lastArbitrageThreshold = 0
let finalCallback: ((msg: string) => void) | null = null

export async function asyncArbitrage(): Promise<void> {
    await makeRequest('POST', '/v1/arbitrage')
    forceFutureArbitrage()
}

function finishArbitrageQueue(): void {
    if (arbitrageIntervalId !== null) {
        clearInterval(arbitrageIntervalId)
        arbitrageIntervalId = null
    }
    if (lastArbitrageCallback && finalCallback) {
        finalCallback(`Arbitragem concluida ultimo treshhold ${lastArbitrageThreshold}`)
        lastArbitrageCallback = null
    }
    getMediaSpread()
    getHighYieldStatistics()
}

async function executeSingleArbitrage(): Promise<void> {
    try {
        const response = await makeRequest('POST', '/v1/arbitrage')
        const threshold = response.data?.threshold
        lastArbitrageThreshold = threshold ?? lastArbitrageThreshold
        if (threshold && lastArbitrageCallback) {
            lastArbitrageCallback(`Arbitrage executed successfully. Threshold: ${threshold}`)
        }
        forceFutureArbitrage()
    } catch (error: any) {
        console.log('Error during arbitrage execution:', error.message)
    }
}

async function runArbitrageTick(): Promise<void> {
    if (pendingArbitrageCount <= 0) {
        finishArbitrageQueue()
        return
    }

    console.log(`Executando arbitragem (${pendingArbitrageCount} restantes na fila)`)
    await executeSingleArbitrage()
    pendingArbitrageCount--

    if (pendingArbitrageCount <= 0) {
        finishArbitrageQueue()
    }
}

export function forceArbitrage(
    quantities: number,
    callback: (msg: string) => void,
    finalCallbackFn: (msg: string) => void = () => {}
): void {
    if (quantities <= 0) return

    pendingArbitrageCount += quantities
    lastArbitrageCallback = callback
    finalCallback = finalCallbackFn

    if (arbitrageIntervalId === null) {
        runArbitrageTick()
        arbitrageIntervalId = setInterval(runArbitrageTick, 28000)
    }
}

export async function getHighYieldStatistics(): Promise<void> {
    try {
        const response = await makeRequest('GET', '/v1/statistics/high-yield-report')
        processStatisticsResponse(response.data)
    } catch (error: any) {
        console.log('Erro na requisição:', error.message)
    }
}

function processStatisticsResponse(data: any): void {
    const { crypto_stats, top_3_exchanges, total_operations, period } = data

    let cryptoMessage = `📊 *Estatísticas por Crypto (${period})*\n\n`
    crypto_stats.forEach((stat: any) => {
        cryptoMessage +=
            `*${stat.ticker}*\n` +
            `Oportunidades: ${stat.count}\n` +
            `Spread médio: ${stat.average_spread.toFixed(2)}%\n\n`
    })
    enviarMensagemTelegram(cryptoMessage)

    let exchangesMessage = `🏆 *Top 3 Exchanges (${period})*\n\n`
    top_3_exchanges.forEach((exchange: any, index: number) => {
        exchangesMessage +=
            `${index + 1}. *${exchange.exchange_name}*\n` +
            `Oportunidades: ${exchange.count}\n\n`
    })
    enviarMensagemTelegram(exchangesMessage)

    const summaryMessage =
        `📈 *Resumo Geral (${period})*\n\n` +
        `Total de operações: *${total_operations}*\n` +
        `Criptos analisadas: *${crypto_stats.length}*\n` +
        `Exchanges ativas: *${top_3_exchanges.length}*`
    enviarMensagemTelegram(summaryMessage)
}

export async function getMediaSpread(): Promise<void> {
    try {
        const response = await makeRequest('GET', '/v1/statistics/avarage-spread')
        enviarMensagemTelegram(
            `A média do spread é de ${response.data.average_spread.toFixed(2)}%`
        )
    } catch (error: any) {
        console.log('Erro na requisição:', error.message)
    }
}

export async function getRankingExchanges(): Promise<any> {
    try {
        const response = await makeRequest('GET', '/v1/statistics/ranking')
        return response.data
    } catch (error: any) {
        console.log('Erro na requisição:', error.message)
        return null
    }
}

export async function gerarRankingExchanges(): Promise<void> {
    try {
        await makeRequest('POST', '/v1/statistics/top3')
        console.log('Ranking gerado com sucesso!')
    } catch (error: any) {
        console.log('Erro na requisição:', error.message)
    }
}

function formatSpotMessage(spot: any): string {
    return (
        `*SPOT x SPOT*\n` +
        `*${spot.ticker}*\n\n` +
        `*${spot.best_buy_exchange_name} ➡️ ${spot.best_sell_exchange_name}*\n\n` +
        `Networks: *${spot.common_networks.join(', ')}*\n` +
        `Lucro potencial: *${spot.profit_percent_ask_bid}%*`
    )
}

function formatFutureMessage(future: any): string {
    return (
        `*SPOT x FUTURE*\n` +
        `*${future.ticker}*\n\n` +
        `*${future.exchange}*\n\n` +
        `Strategy: *${future.strategy}*`
    )
}

function formatTopCryptoMessage(topCrypto: any): string {
    return (
        `*TOP CRYPTO*\n` +
        `*${topCrypto.crypto}*\n\n` +
        `*${topCrypto.buy_exchange_name} ➡️ ${topCrypto.sell_exchange_name}*\n\n` +
        `Preço: *${topCrypto.buy_price} ➡️ ${topCrypto.sell_price}*\n` +
        `Lucro potencial: *${topCrypto.profit_percent}%*`
    )
}

function processArbitrageData(data: any): string {
    const { type, operation, future_operation, top_crypto_operation } = data

    switch (type) {
        case 'future':
            return formatFutureMessage(future_operation)
        case 'top_crypto':
            return formatTopCryptoMessage(top_crypto_operation)
        default:
            return formatSpotMessage(operation)
    }
}

async function consultar(id: string): Promise<void> {
    try {
        const response = await makeRequest('GET', `/v1/arbitrage/${id}`, null, { timeout: 2000 })
        const message = processArbitrageData(response.data)
        enviarMensagemAvisoCrypto(message)
    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            console.log('A requisição foi abortada por exceder o tempo limite de 4 segundos.')
        } else {
            console.log('Erro na requisição:', error.message)
        }
    }
}

function enviarMensagemDiscord(message: string): void {
    const ctx = contextInstance()
    if (!ctx) {
        console.warn('[Discord] Context ainda não inicializado, mensagem ignorada.')
        return
    }
    ctx.emitEvent('enviar-mensagem-discord', { message })
}

function enviarMensagemTelegram(message: string): void {
    const ctx = contextInstance()
    if (!ctx) {
        console.warn('[Telegram] Context ainda não inicializado, mensagem ignorada.')
        return
    }
    ctx.emitEvent('enviar-mensagem-telegram', { message, chatId: GROUP_ID })
}

export function enviarMensagemAvisoCrypto(message: string): void {
    enviarMensagemDiscord(message)
    enviarMensagemTelegram(message)
}

export function processAMQPMessage(message: any, routingKey: string): void {
    const jsonContent = JSON.parse(message.content.toString())

    switch (routingKey) {
        case 'NOVA_ARBITRAGEM':
            consultar(jsonContent?.id)
            break
        case 'WHALE_ALERT':
            enviarMensagemAvisoCrypto(jsonContent?.alert)
            break
        case 'SIMPLE_MESSAGE':
            enviarMensagemAvisoCrypto(jsonContent?.message)
            break
        case 'ALERT_TELEGRAM_PRIVATE_USER':
            enviarAlertaParaUsuario(jsonContent?.content)
            break
        case 'ALERT_EMAIL_PRIVATE_USER': {
            const { email, message: emailMessage } = jsonContent?.content
            sendEmail({
                to: email,
                subject: 'Alerta de arbitragem',
                body: emailMessage
            })
            break
        }
        case 'ALERT_SMS_PRIVATE_USER':
            console.log(jsonContent?.content)
            break
    }
}

function evidenciarRankingExchanges(exchangesRanking: any[]): void {
    const evidenciaCompra = exchangesRanking
        .filter(ex => ex.type === 'buy')
        .map(ex => `${ex.exchange_name} - Quantidade de oportunidades ${ex.count}`)
        .join('\n')

    const evidenciaVenda = exchangesRanking
        .filter(ex => ex.type === 'sell')
        .map(ex => `${ex.exchange_name} - Quantidade de oportunidades ${ex.count}`)
        .join('\n')

    enviarMensagemAvisoCrypto(`Ranking de exchanges para compra:\n${evidenciaCompra}\n`)
    enviarMensagemAvisoCrypto(`Ranking de exchanges para venda:\n${evidenciaVenda}\n`)
}

export function rotinaDiariaCrypto(): void {
    gerarRankingExchanges()
    getMediaSpread()

    setTimeout(async () => {
        getRankingExchanges().then((data: any) => {
            evidenciarRankingExchanges(data)
        })
    }, 15000)
}
