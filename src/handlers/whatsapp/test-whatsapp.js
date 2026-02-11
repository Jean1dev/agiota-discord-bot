const { requireAdmin } = require('../guard-handler')
const { sendTestMessage } = require('../../services/WhatsAppService')

async function handle(message) {
  const result = await sendTestMessage()
  if (result.ok) {
    await message.reply('✅ Mensagem de teste enviada no WhatsApp.')
  } else {
    await message.reply('❌ Falha no teste: ' + result.error)
  }
}

module.exports = message => requireAdmin(message, handle)
