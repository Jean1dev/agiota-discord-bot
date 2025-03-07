const axios = require('axios');
const { contextInstance } = require('../context');
const baseUrl = "https://crypto-svc-e108728a6a2f.herokuapp.com"
const GROUP_ID = -1002156828677

function getMediaSpread() {
    axios.get(`${baseUrl}/v1/statistics/avarage-spread`)
        .then(response =>
            enviarMensagemTelegram(`A média do spread é de ${response.data.average_spread.toFixed(2)}%`)
        ).catch(error => console.log('Erro na requisição:', error.message));
}

function limparEstatisticas() {
    axios.delete(`${baseUrl}/v1/statistics`)
        .then(() =>
            console.log('Estatísticas limpas com sucesso!')
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
        timeout: 4000
    })
        .then(response => {
            enviarMensagemAvisoCrypto(response.data.html_message)
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

module.exports = {
    processAMQPMessage,
    getMediaSpread,
    limparEstatisticas,
    getRankingExchanges,
    gerarRankingExchanges,
    enviarMensagemAvisoCrypto
}
