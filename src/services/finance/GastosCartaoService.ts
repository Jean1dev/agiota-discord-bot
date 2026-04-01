import { appEvents } from '../../shared/events/AppEvents'

export const LIMIT = 8400

// context ainda é JS — será removido na Fase 12
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getContext() { return require('../../context').contextInstance() }

export function atualizarTotalGasto(valor: number): void {
  const ctx = getContext()
  ctx.totalGastoCartao = valor
  ctx.save()
}

function verificarLimiteEstourado(): void {
  if (getContext().totalGastoCartao > LIMIT) {
    appEvents.emit('enviar-mensagem-telegram', 'O limite do cartão foi estourado!')
  }
}

export function adicionarGasto(valor: number): void {
  const ctx = getContext()
  ctx.totalGastoCartao += valor
  ctx.save()
  verificarLimiteEstourado()
}
