import { contextInstance } from '../../context'
import { appEvents } from '../../shared/events/AppEvents'

export const LIMIT = 8400

export function atualizarTotalGasto(valor: number): void {
  const ctx = contextInstance()
  ctx.totalGastoCartao = valor
  ctx.save()
}

function verificarLimiteEstourado(): void {
  if (contextInstance().totalGastoCartao > LIMIT) {
    appEvents.emit('enviar-mensagem-telegram', 'O limite do cartão foi estourado!')
  }
}

export function adicionarGasto(valor: number): void {
  const ctx = contextInstance()
  ctx.totalGastoCartao += valor
  ctx.save()
  verificarLimiteEstourado()
}
