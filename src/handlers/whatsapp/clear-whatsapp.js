const { requireAdmin } = require('../guard-handler')
const { clearAndDisconnect } = require('../../services/WhatsAppService')

async function handle(message) {
  try {
    await clearAndDisconnect()
    await message.reply('Sessão do WhatsApp removida. Use `$whatsapp-config` para vincular novamente.')
  } catch (e) {
    console.error('clear-whatsapp error', e)
    await message.reply('Erro ao limpar sessão: ' + (e.message || String(e))).catch(() => {})
  }
}

module.exports = message => requireAdmin(message, handle)
