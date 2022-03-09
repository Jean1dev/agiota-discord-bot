const { registrarAposta, criarNovoJogo } = require('./game-functions')

module.exports = (args, message) => {
  const numero = Number(args[1])
  const autor = message.author.id
  const aposta = {
    numero,
    autor
  }

  const retorno = registrarAposta(aposta)
  if (retorno.status) {
    message.reply('aposta realizada com sucesso')
    return
  }

  message.reply(retorno.message)

  if(retorno.message === 'Não existe um jogo aberto') {
    setTimeout(() => criarNovoJogo(), 10000)
  }
}
