const axios = require('axios');
const { contextInstance } = require('../context');
const { enviarAlertaParaUsuario } = require('../telegram/handlers/public-handler');
const sendEmail = require('./EmailService');

const URLS = {
    primary: "https://crypto-svc-eur-0e4c4365b070.herokuapp.com",
    backup: "https://crypto-svc-e108728a6a2f.herokuapp.com"
};

let currentUrl = URLS.primary;
const GROUP_ID = -1002156828677;

async function makeRequest(method, endpoint, data = null, options = {}) {
    console.log(method, ' . . ', `${currentUrl}${endpoint}`)
    
    const config = {
        method,
        url: `${currentUrl}${endpoint}`,
        timeout: options.timeout || 10000,
        ...options
    };

    if (data) {
        config.data = data;
    }

    try {
        const response = await axios(config);
        return response;
    } catch (error) {
        if (error.response?.status === 503 && currentUrl === URLS.primary) {
            console.log('Erro 503 detectado, trocando para URL reserva');
            currentUrl = URLS.backup;
            return makeRequest(method, endpoint, data, options);
        }
        throw error;
    }
}

function forceFutureArbitrage() {
    setTimeout(async () => {
        try {
            const response = await makeRequest('POST', '/v1/arbitrage/future');
            console.log(response.data);
        } catch (error) {
            console.log(error);
        }
    }, 5000);
}

async function asyncArbitrage() {
    await makeRequest('POST', '/v1/arbitrage');
    forceFutureArbitrage();
}

function forceArbitrage(quantities, callback) {
    let count = 0;
    let lastTreshhold = 0;
    
    const interval = setInterval(async () => {
        if (count >= quantities) {
            clearInterval(interval);
            callback(`Arbitragem concluida ultimo treshhold ${lastTreshhold}`);
            getMediaSpread();
            getHighYieldStatistics();
            return;
        }

        console.log(`Executando arbitragem ${count + 1} de ${quantities}`);
        try {
            const response = await makeRequest('POST', '/v1/arbitrage');
            const threshold = response.data?.threshold;
            lastTreshhold = threshold;
            if (threshold) {
                callback(`Arbitrage executed successfully. Threshold: ${threshold}`);
            }
            forceFutureArbitrage();
        } catch (error) {
            console.log('Error during arbitrage execution:', error.message);
        }

        count++;
    }, 26000);
}

async function getHighYieldStatistics() {
    try {
        const response = await makeRequest('GET', '/v1/statistics/high-yield-report');
        processStatisticsResponse(response.data);
    } catch (error) {
        console.log('Erro na requisição:', error.message);
    }
}

function processStatisticsResponse(data) {
    const { crypto_stats, top_3_exchanges, total_operations, period } = data;
    
    let cryptoMessage = `📊 *Estatísticas por Crypto (${period})*\n\n`;
    crypto_stats.forEach(stat => {
        cryptoMessage += `*${stat.ticker}*\n` +
            `Oportunidades: ${stat.count}\n` +
            `Spread médio: ${stat.average_spread.toFixed(2)}%\n\n`;
    });
    enviarMensagemTelegram(cryptoMessage);
    
    let exchangesMessage = `🏆 *Top 3 Exchanges (${period})*\n\n`;
    top_3_exchanges.forEach((exchange, index) => {
        exchangesMessage += `${index + 1}. *${exchange.exchange_name}*\n` +
            `Oportunidades: ${exchange.count}\n\n`;
    });
    enviarMensagemTelegram(exchangesMessage);
    
    let summaryMessage = `📈 *Resumo Geral (${period})*\n\n` +
        `Total de operações: *${total_operations}*\n` +
        `Criptos analisadas: *${crypto_stats.length}*\n` +
        `Exchanges ativas: *${top_3_exchanges.length}*`;
    enviarMensagemTelegram(summaryMessage);
}

async function getMediaSpread() {
    try {
        const response = await makeRequest('GET', '/v1/statistics/avarage-spread');
        enviarMensagemTelegram(`A média do spread é de ${response.data.average_spread.toFixed(2)}%`);
    } catch (error) {
        console.log('Erro na requisição:', error.message);
    }
}

async function getRankingExchanges() {
    try {
        const response = await makeRequest('GET', '/v1/statistics/ranking');
        return response.data;
    } catch (error) {
        console.log('Erro na requisição:', error.message);
        return null;
    }
}

async function gerarRankingExchanges() {
    try {
        await makeRequest('POST', '/v1/statistics/top3');
        console.log('Ranking gerado com sucesso!');
    } catch (error) {
        console.log('Erro na requisição:', error.message);
    }
}

function formatSpotMessage(spot) {
    return `*SPOT x SPOT*\n` +
        `*${spot.ticker}*\n\n` +
        `*${spot.best_buy_exchange_name} ➡️ ${spot.best_sell_exchange_name}*\n\n` +
        `Networks: *${spot.common_networks.join(', ')}*\n` +
        `Lucro potencial: *${spot.profit_percent_ask_bid}%*`;
}

function formatFutureMessage(future) {
    return `*SPOT x FUTURE*\n` +
        `*${future.ticker}*\n\n` +
        `*${future.exchange}*\n\n` +
        `Strategy: *${future.strategy}*`;
}

function formatTopCryptoMessage(topCrypto) {
    return `*TOP CRYPTO*\n` +
        `*${topCrypto.crypto}*\n\n` +
        `*${topCrypto.buy_exchange_name} ➡️ ${topCrypto.sell_exchange_name}*\n\n` +
        `Preço: *${topCrypto.buy_price} ➡️ ${topCrypto.sell_price}*\n` +
        `Lucro potencial: *${topCrypto.profit_percent}%*`;
}

function processArbitrageData(data) {
    const { type, operation, future_operation, top_crypto_operation } = data;
    
    switch (type) {
        case 'future':
            return formatFutureMessage(future_operation);
        case 'top_crypto':
            return formatTopCryptoMessage(top_crypto_operation);
        default:
            return formatSpotMessage(operation);
    }
}

async function consultar(id) {
    try {
        const response = await makeRequest('GET', `/v1/arbitrage/${id}`, null, { timeout: 2000 });
        const message = processArbitrageData(response.data);
        enviarMensagemAvisoCrypto(message);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.log('A requisição foi abortada por exceder o tempo limite de 4 segundos.');
        } else {
            console.log('Erro na requisição:', error.message);
        }
    }
}

function enviarMensagemDiscord(message) {
    contextInstance().emitEvent('enviar-mensagem-discord', {
        message: message
    })
}

function enviarMensagemTelegram(message) {
    contextInstance().emitEvent('enviar-mensagem-telegram', {
        message: message,
        chatId: GROUP_ID
    })
}

function enviarMensagemAvisoCrypto(message) {
    enviarMensagemDiscord(message)
    enviarMensagemTelegram(message)
}

function processAMQPMessage(message, routingKey) {
    const jsonContent = JSON.parse(message.content.toString());

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
        case 'ALERT_EMAIL_PRIVATE_USER':
            const { email, message } = jsonContent?.content
            sendEmail({
                to: email,
                subject: 'Alerta de arbitragem',
                message: message
            })
            break
        case 'ALERT_SMS_PRIVATE_USER':
            console.log(jsonContent?.content)
            break
    }
}

function evidenciarRankingExchanges(exchangesRanking) {
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

function rotinaDiariaCrypto() {
    gerarRankingExchanges()
    getMediaSpread()

    setTimeout(async () => {
        getRankingExchanges()
            .then(data => {
                evidenciarRankingExchanges(data)
            })
    }, 15000)
}

module.exports = {
    processAMQPMessage,
    getMediaSpread,
    getRankingExchanges,
    gerarRankingExchanges,
    enviarMensagemAvisoCrypto,
    forceArbitrage,
    rotinaDiariaCrypto,
    getHighYieldStatistics,
    asyncArbitrage
}
