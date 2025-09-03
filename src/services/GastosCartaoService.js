const context = require('../context').contextInstance
const LIMIT = 8400

function atualizarTotalGasto(valor) {
    setTimeout(() => {
        context().totalGastoCartao = valor
        context().save()
    }, 5000)
}

function verificarLimiteEstourado() {
    if (context().totalGastoCartao > LIMIT) {
        context().emitEvent('enviar-mensagem-telegram', `O limite do cartão foi estourado!`)
    }
}

function adicionarGasto(valor) {
    setTimeout(() => {
        context().totalGastoCartao += valor
        context().save()
        verificarLimiteEstourado()
    }, 5000)
}

module.exports = {
    adicionarGasto,
    atualizarTotalGasto
}