const { requireAdmin } = require('../guard-handler')
const { contextInstance } = require('../../context')

async function handle(message) {
  const context = contextInstance()
  context.changeAutoArbitragem()
  
  const status = context.autoArbitragem ? 'ativada' : 'desativada'
  message.reply(`Auto arbitragem ${status} com sucesso!`)
}

module.exports = message => requireAdmin(message, handle)
