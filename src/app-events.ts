import * as amqp from 'amqplib/callback_api'
import type { Message } from 'amqplib'

import { env } from './config/env'
import { updateStateAfterDataLoad } from './handlers/jogo-bixo/game-functions'
import { notificacaoCaixinha, cryptoServiceProcessMessage, broadcastDiscord } from './services'
import { createLogger } from './shared/logger/Logger'
import { appEvents } from './shared/events/AppEvents'
import { enviarMensagemParaMim, enviarMensagemHTML } from './telegram'

const log = createLogger('AppEvents')

appEvents.on('update-state-jogo-bixo', () => {
  updateStateAfterDataLoad()
})

appEvents.on('notification-emprestimo', () => {
  log.info('notification-emprestimo')
})

appEvents.on('enviar-mensagem-telegram', payload => {
  if (typeof payload === 'string') {
    enviarMensagemParaMim(payload)
    return
  }
  enviarMensagemHTML(payload.message, payload.chatId)
})

appEvents.on('enviar-mensagem-discord', ({ message }) => {
  broadcastDiscord(message)
})

function dispatchAmqpPayload(queue: string, msg: Message, kind: 'caixinha' | 'crypto'): void {
  const preview = msg.content.toString().slice(0, 200)
  log.info({ queue, kind, preview }, 'AMQP mensagem recebida')
  if (kind === 'caixinha') {
    notificacaoCaixinha(msg.content.toString())
    return
  }
  cryptoServiceProcessMessage(msg, msg.fields.routingKey ?? '')
}

function startAmqpConsumers(): void {
  const url = env.AMQP_CONNECTION
  if (!url) {
    log.warn('AMQP_CONNECTION ausente — consumidores não iniciados')
    return
  }

  amqp.connect(url, (errConn, connection) => {
    if (errConn) {
      log.error({ err: errConn }, 'AMQP connect falhou')
      return
    }

    connection.createChannel((errCh, channel) => {
      if (errCh) {
        log.error({ err: errCh }, 'AMQP createChannel falhou')
        connection.close(() => undefined)
        return
      }

      const queueCaixinha = 'caixinha-serverless'
      channel.assertQueue(queueCaixinha, { durable: false })
      channel.consume(
        queueCaixinha,
        (msg: Message | null) => {
          if (!msg) return
          dispatchAmqpPayload(queueCaixinha, msg, 'caixinha')
        },
        { noAck: true },
      )

      const queueCrypto = 'crypto.arbitragem.queue'
      channel.assertQueue(queueCrypto, { durable: true })
      channel.consume(
        queueCrypto,
        (msg: Message | null) => {
          if (!msg) return
          dispatchAmqpPayload(queueCrypto, msg, 'crypto')
        },
        { noAck: true },
      )
    })
  })
}

startAmqpConsumers()

export { appEvents }
