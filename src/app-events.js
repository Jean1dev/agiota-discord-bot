const { updateStateAfterDataLoad } = require('./handlers/jogo-bixo/game-functions')
const { AMQP_CONNECTION } = require('./config')
const { notificacaoCaixinha } = require('./services')
const amqp = require('amqplib/callback_api');

const EventEmitter = require('events')

class AppEvents extends EventEmitter { }

const appEvents = new AppEvents()

appEvents.on('update-state-jogo-bixo', () => {
    console.info('event::', 'update-state-jogo-bixo')
    updateStateAfterDataLoad()
})

appEvents.on('notification-emprestimo', () => {
    console.info('event::', 'notification-emprestimo')
})

amqp.connect(AMQP_CONNECTION, function (error0, connection) {
    if (error0) {
        throw error0;
    }

    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }
        var queue = 'caixinha-serverless';

        channel.assertQueue(queue, {
            durable: false
        });

        channel.consume(queue, function (msg) {
            console.log(" [x] Received %s", msg.content.toString());
            notificacaoCaixinha(msg.content.toString())
        }, {
            noAck: true
        });
    });
});


module.exports = appEvents