const context = require('../context').contextInstance
const LIMIT = 8400

// CORRIGIDO: setTimeout removido — não havia justificativa para o delay de 5s,
// e causava race conditions + fire-and-forget no save().
function atualizarTotalGasto(valor) {
    context().totalGastoCartao = valor
    context().save()
}

function verificarLimiteEstourado() {
    if (context().totalGastoCartao > LIMIT) {
        context().emitEvent('enviar-mensagem-telegram', `O limite do cartão foi estourado!`)
    }
}

function adicionarGasto(valor) {
    context().totalGastoCartao += valor
    context().save()
    verificarLimiteEstourado()
}

module.exports = {
    adicionarGasto,
    atualizarTotalGasto,
    LIMIT
}
