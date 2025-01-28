const { gastosCartao } = require('../../services')
const { requireAdmin } = require('../guard-handler')

function handle(args, message) {
    const money = args[0]
    gastosCartao.atualizarTotalGasto(Number(money))
    message.reply(`feito`)
}

module.exports = async (args, message) => requireAdmin(args, message, handle)