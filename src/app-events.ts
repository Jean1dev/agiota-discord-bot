import * as amqp from 'amqplib/callback_api'
import type { Message } from 'amqplib'

import { env } from './config/env'
import { updateStateAfterDataLoad } from './handlers/jogo-bixo/game-functions'
import { notificacaoCaixinha, cryptoServiceProcessMessage, broadcastDiscord } from './services'
import { createLogger } from './shared/logger/Logger'
import { appEvents } from './shared/events/AppEvents'
import { enviarMensagemParaMim, enviarMensagemHTML } from './telegram'

const log = createLogger('AppEvents')

const RECONNECT_BASE_MS = 5_000
const RECONNECT_MAX_MS = 60_000

let reconnectScheduled = false

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

function scheduleReconnect(attempt: number): void {
  if (reconnectScheduled) return
  reconnectScheduled = true
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)
  log.info({ attempt, delayMs: delay }, 'AMQP reconexão agendada')
  setTimeout(() => {
    reconnectScheduled = false
    startAmqpConsumers(attempt + 1)
  }, delay)
}

function startAmqpConsumers(attempt = 0): void {
  const url = env.AMQP_CONNECTION
  if (!url) {
    log.warn('AMQP_CONNECTION ausente — consumidores não iniciados')
    return
  }

  amqp.connect(url, (errConn, connection) => {
    if (errConn) {
      log.error({ err: errConn, attempt }, 'AMQP connect falhou')
      broadcastDiscord(`⚠️ RabbitMQ: falha ao conectar (tentativa ${attempt + 1}) — ${errConn.message}`)
      scheduleReconnect(attempt)
      return
    }

    log.info('AMQP conectado')
    if (attempt > 0) {
      broadcastDiscord('✅ RabbitMQ: conexão restabelecida com sucesso.')
    }

    connection.on('error', (err) => {
      log.error({ err }, 'AMQP connection error')
      broadcastDiscord(`🔴 RabbitMQ: erro na conexão — ${err.message}`)
    })

    connection.on('close', () => {
      log.warn('AMQP connection fechada')
      broadcastDiscord('🔴 RabbitMQ: conexão encerrada inesperadamente. Reconectando...')
      scheduleReconnect(0)
    })

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

      log.info('AMQP consumidores iniciados')
    })
  })
}

startAmqpConsumers()

export { appEvents }
