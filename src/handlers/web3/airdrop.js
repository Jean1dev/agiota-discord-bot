const { requestAirDrop } = require('web3-client-lib/dist/src/solana/index.js')

function deleteMessageAfterTime(message) {
    setTimeout(() => message.delete(), 25000)
}

function resultHandlerError(sols, pubKey, net, max_retrys, message, resultStr) {
    if (max_retrys > 0) {
        const new_retrys = max_retrys - 1
        message.channel.send(`Tentando novamente, tentativas restantes: ${new_retrys}`).then(deleteMessageAfterTime)
        setTimeout(() => tryAirdrop(sols, pubKey, net, new_retrys, message), 15000)
    } else {
        message.reply(resultStr?.errorDetails?.message || 'Erro ao realizar airdrop')
        message.channel.send(`Try https://solfaucet.com/ pubKey ${resultStr.pubKey}`)
    }
}

function tryAirdrop(sols, pubKey, net, max_retrys, message) {
    requestAirDrop(sols, pubKey, net)
        .then((result) => {
            if (result.error) {
                return resultHandlerError(sols, pubKey, net, max_retrys, message, result)
            }
            message.reply('Airdrop realizado com sucesso')
        })
        .catch((error) => {
            console.log(error)
            resultHandlerError(sols, pubKey, net, max_retrys, message, error)
        })
}

module.exports = (args, message) => {
    const sols = Number(args[0])
    const pubKey = args[1]
    const net = args[2]
    const max_retrys = 25
    tryAirdrop(sols, pubKey, net, max_retrys, message)
}