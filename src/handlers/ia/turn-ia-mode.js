const context = require('../../context')

module.exports = message => {
  context.isIAEnabled = !context.isIAEnabled
  context.isChatGPTEnabled = context.isIAEnabled

  if (context.isIAEnabled) {
    message.channel.send('Inteligencia Artificial ativada, estou aprendendo com vcs  👽👻👩‍🏫👩‍🏫 ')
  } else {
    message.channel.send('Inteligencia Artificial desativada, estou aprendendo com vcs  👩‍💻 🥵')
  }
}
