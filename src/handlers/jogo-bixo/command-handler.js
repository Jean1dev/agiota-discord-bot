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
    message.reply('não se preocupe, irei criar um jogo pra vc e registrarei sua aposta')
    setTimeout(() => criarNovoJogo(), 10000)
    setTimeout(() => registrarAposta(aposta), 15000)
  }
}
