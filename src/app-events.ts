import { appEvents } from './shared/events/AppEvents'
import { updateStateAfterDataLoad } from './handlers/jogo-bixo/game-functions'
import { env } from './config/env'
import { notificacaoCaixinha, cryptoServiceProcessMessage, broadcastDiscord } from './services'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const amqp = require('amqplib/callback_api')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { enviarMensagemParaMim, enviarMensagemHTML } = require('./telegram')

appEvents.on('update-state-jogo-bixo', () => {
  updateStateAfterDataLoad()
})

appEvents.on('notification-emprestimo', () => {
  console.info('event::', 'notification-emprestimo')
})

appEvents.on('enviar-mensagem-telegram', (payload: any) => {
  if (typeof payload === 'string' || payload instanceof String) {
    enviarMensagemParaMim(payload)
    return
  }
  enviarMensagemHTML(payload.message, payload.chatId)
})

appEvents.on('enviar-mensagem-discord', ({ message }: { message: string }) => {
  broadcastDiscord(message)
})

amqp.connect(env.AMQP_CONNECTION, (error0: Error | null, connection: any) => {
  if (error0) throw error0

  connection.createChannel((error1: Error | null, channel: any) => {
    if (error1) throw error1

    const queue = 'caixinha-serverless'
    channel.assertQueue(queue, { durable: false })
    channel.consume(queue, (msg: any) => {
      console.log(' [x] Received %s', msg.content.toString())
      notificacaoCaixinha(msg.content.toString())
    }, { noAck: true })

    const queue2 = 'crypto.arbitragem.queue'
    channel.assertQueue(queue2, { durable: true })
    channel.consume(queue2, (msg: any) => {
      console.log(' [x] Received %s', msg.content.toString())
      cryptoServiceProcessMessage(msg, msg.fields.routingKey)
    }, { noAck: true })
  })
})

export { appEvents }
