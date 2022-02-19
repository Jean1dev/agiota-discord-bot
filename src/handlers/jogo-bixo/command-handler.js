const { registrarAposta, criarNovoJogo } = require('./game-functions')

module.exports = (args, message) => {
  const numero = args[1]
  const autor = message.author.id
  const aposta = {
    numero,
    autor
  }

  if (registrarAposta(aposta)) {
    message.reply('aposta realizada com sucesso')
    return
  }


  message.reply(`Não tem um jogo aberto no momento, já irei criar um`)
  setTimeout(() => criarNovoJogo(), 10000)
}
