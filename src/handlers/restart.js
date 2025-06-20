const { requireAdmin } = require("./guard-handler")

async function handler(message) {
  try {
    await message.reply('🔄 Reiniciando a aplicação...')
    
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  } catch (error) {
    message.reply('❌ Erro ao tentar reiniciar a aplicação')
    console.error('Erro no comando restart:', error)
  }
}

module.exports = message => requireAdmin(message, handler) 