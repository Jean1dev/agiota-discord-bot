// EventEmitter tipado em src/shared/events/AppEvents.ts
// Este arquivo mantém os listeners de side-effect (AMQP, serviços JS)
const { appEvents } = require('./shared/events/AppEvents')
const { updateStateAfterDataLoad } = require('./handlers/jogo-bixo/game-functions')
const { AMQP_CONNECTION } = require('./config')
const { notificacaoCaixinha, cryptoServiceProcessMessage, broadcastDiscord } = require('./services')
const amqp = require('amqplib/callback_api')
const { enviarMensagemParaMim, enviarMensagemHTML } = require('./telegram')

appEvents.on('update-state-jogo-bixo', () => {
    updateStateAfterDataLoad()
})

appEvents.on('notification-emprestimo', () => {
    console.info('event::', 'notification-emprestimo')
})

appEvents.on('enviar-mensagem-telegram', payload => {
    if (typeof payload === 'string' || payload instanceof String) {
        enviarMensagemParaMim(payload)
        return
    }
    enviarMensagemHTML(payload.message, payload.chatId)
})

appEvents.on('enviar-mensagem-discord', ({ message }) => {
    broadcastDiscord(message)
})

amqp.connect(AMQP_CONNECTION, function (error0, connection) {
    if (error0) {
        throw error0
    }

    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1
        }

        const queue = 'caixinha-serverless'
        channel.assertQueue(queue, { durable: false })
        channel.consume(queue, function (msg) {
            console.log(' [x] Received %s', msg.content.toString())
            notificacaoCaixinha(msg.content.toString())
        }, { noAck: true })

        const queue2 = 'crypto.arbitragem.queue'
        channel.assertQueue(queue2, { durable: true })
        channel.consume(queue2, function (msg) {
            console.log(' [x] Received %s', msg.content.toString())
            cryptoServiceProcessMessage(msg, msg.fields.routingKey)
        }, { noAck: true })
    })
})

module.exports = appEvents
