const {
    gerarRankingExchanges,
    getMediaSpread,
    getRankingExchanges,
    limparEstatisticas,
    enviarMensagemAvisoCrypto
} = require('../../services/cryptoArbitrageService');

function deleteMessageAfterTime(message) {
    setTimeout(() => message.delete(), 10000)
}

function evidenciarRankingExchanges(exchangesRanking) {
    const evidenciaCompra = exchangesRanking
        .filter(ex => ex.type === 'buy')
        .map(ex => `${ex.exchange_name} - Quantidade de oportunidades ${ex.count}`)
        .join('\n')

    const evidenciaVenda = exchangesRanking
        .filter(ex => ex.type === 'sell')
        .map(ex => `${ex.exchange_name} - Quantidade de oportunidades ${ex.count}`)
        .join('\n')

    enviarMensagemAvisoCrypto(`Ranking de exchanges para compra:\n${evidenciaCompra}\n`)
    enviarMensagemAvisoCrypto(`Ranking de exchanges para venda:\n${evidenciaVenda}\n`)
}

async function cryptoHandles() {
    gerarRankingExchanges()
    getMediaSpread()

    setTimeout(async () => {
        getRankingExchanges()
            .then(data => {
                evidenciarRankingExchanges(data)
                setTimeout(limparEstatisticas, 15000)
            })
    }, 15000)
}

module.exports = async message => {
    message.reply('momentinho vou verificar').then(deleteMessageAfterTime)
    await cryptoHandles()
}