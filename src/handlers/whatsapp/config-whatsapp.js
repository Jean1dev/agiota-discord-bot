const { requireAdmin } = require('../guard-handler')
const { startPairing } = require('../../services/WhatsAppService')

async function handle(message) {
  try {
    await message.reply('Iniciando configuração do WhatsApp...')
    await startPairing(message.channel)
  } catch (e) {
    console.error('config-whatsapp error', e)
    await message.reply('Erro ao configurar WhatsApp: ' + (e.message || String(e))).catch(() => {})
  }
}

module.exports = message => requireAdmin(message, handle)
