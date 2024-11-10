const axios = require('axios');
const { contextInstance } = require('../context');
const baseUrl = "https://crypto-svc-e108728a6a2f.herokuapp.com"
const GROUP_ID = -1002156828677

function enviarMensagem(htmlMessage) {
    contextInstance().emitEvent('enviar-mensagem-telegram', {
        message: htmlMessage,
        chatId: GROUP_ID
    })
}

function consultar(id) {
    axios.get(`${baseUrl}/v1/arbitrage/${id}`, {
        timeout: 4000
    })
    .then(response => {
        enviarMensagem(response.data.html_message)
    })
    .catch(error => {
        if (error.code === 'ECONNABORTED') {
            console.log('A requisição foi abortada por exceder o tempo limite de 4 segundos.');
        } else {
            console.log('Erro na requisição:', error.message);
        }
    });
}

function enviarMensagem(alert) {
    contextInstance().emitEvent('enviar-mensagem-discord', {
        message: alert
    })
}

function processAMQPMessage(message) {
    const jsonContent = JSON.parse(message.content.toString());
    const id = jsonContent?.id;
    const alert = jsonContent?.alert;
    if (id) {
        consultar(id)
    } else if (alert) {
        enviarMensagem(alert)
        return
    }
}

module.exports = {
    processAMQPMessage
}