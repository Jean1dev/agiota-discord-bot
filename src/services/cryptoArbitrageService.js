const axios = require('axios');
const { contextInstance } = require('../context');
const baseUrl = "https://crypto-svc-eur-0e4c4365b070.herokuapp.com"
const GROUP_ID = -1002156828677

function forceFutureArbitrage() {
    setTimeout(() => {
        axios.post(`${baseUrl}/v1/arbitrage/future`)
            .then(response => {
                console.log(response.data)
            })
            .catch(error => {
                console.log(error)
            })
    }, 5000)
}

function forceArbitrage(quantities, callback) {
    let count = 0;
    let lastTreshhold = 0;
    const interval = setInterval(() => {
        if (count >= quantities) {
            clearInterval(interval);
            callback(`Arbitragem concluida ultimo treshhold ${lastTreshhold}`)
            return;
        }

        console.log(`Executando arbitragem ${count + 1} de ${quantities}`);
        axios.post(`${baseUrl}/v1/arbitrage`)
            .then(response => {
                const threshold = response.data?.threshold;
                lastTreshhold = threshold
                if (threshold) {
                    callback(`Arbitrage executed successfully. Threshold: ${threshold}`);
                }
                forceFutureArbitrage()
            })
            .catch(error => {
                console.log('Error during arbitrage execution:', error.message);
            });

        count++;
    }, 21000);
}

function getMediaSpread() {
    axios.get(`${baseUrl}/v1/statistics/avarage-spread`)
        .then(response =>
            enviarMensagemTelegram(`A média do spread é de ${response.data.average_spread.toFixed(2)}%`)
        ).catch(error => console.log('Erro na requisição:', error.message));
}

function getRankingExchanges() {
    return axios.get(`${baseUrl}/v1/statistics/ranking`)
        .then(response => {
            return response.data
        }).catch(error => console.log('Erro na requisição:', error.message));
}

function gerarRankingExchanges() {
    axios.post(`${baseUrl}/v1/statistics/top3`)
        .then(() =>
            console.log('Ranking gerado com sucesso!')
        ).catch(error => console.log('Erro na requisição:', error.message));
}

function consultar(id) {
    axios.get(`${baseUrl}/v1/arbitrage/${id}`, {
        timeout: 2000
    })
        .then(response => {
            const data = response.data;
            const isFuture = data.type === 'future'
            const spot = data.operation
            const future = data.future_operation

            
            let message;
            
            if (isFuture) {
                message = `*SPOT x FUTURE*\n` +
                    `*${future.ticker}*\n\n` +
                    `*${future.exchange}*\n\n` +
                    `Strategy: *${future.strategy}*`;
            } else {
                message = `*SPOT x SPOT*\n` +
                    `*${spot.ticker}*\n\n` +
                    `*${spot.best_buy_exchange_name} ➡️ ${spot.best_sell_exchange_name}*\n\n` +
                    `Networks: *${spot.common_networks.join(', ')}*\n` +
                    `Lucro potencial: *${spot.profit_percent_ask_bid}%*`;
            }

            enviarMensagemAvisoCrypto(message)
        })
        .catch(error => {
            if (error.code === 'ECONNABORTED') {
                console.log('A requisição foi abortada por exceder o tempo limite de 4 segundos.');
            } else {
                console.log('Erro na requisição:', error.message);
            }
        });
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

function processAMQPMessage(message) {
    const jsonContent = JSON.parse(message.content.toString());
    const id = jsonContent?.id;
    const alert = jsonContent?.alert;
    if (id) {
        consultar(id)
    } else if (alert) {
        enviarMensagemAvisoCrypto(alert)
        return
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
    rotinaDiariaCrypto
}
