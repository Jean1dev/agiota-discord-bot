const { requireAdmin } = require('../guard-handler')
const { futureCrossingCounts } = require('../../services')

async function handle(message) {
  try {
    const response = await futureCrossingCounts()
    const data = response.data
    const body = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
    message.reply(`crossing-counts:\n\`\`\`${body}\`\`\``)
  } catch (error) {
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message
    message.reply(`Erro: ${msg}`)
  }
}

module.exports = message => requireAdmin(message, handle)
