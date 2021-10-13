const context = require('../context')
const repository = require('../repository/operations')

module.exports = async (args, message) => {
  message.reply('blz, vou adicionar a divida')
  const valorDivida = args[1]
  const userId = args[2]
  const descricao = args.splice(3, args.length).join(' ')
  const usuario = context.dividas.find(user => user.id === userId)

  if (usuario) {
    usuario.pendencias.push({
      data: new Date(),
      valor: valorDivida,
      descricao
    })

    repository.save(context.dividas)
    return
  }

  context.dividas.push({
    id: userId,
    pagamentos: [],
    pendencias: [{
      data: new Date(),
      valor: valorDivida,
      descricao
    }]
  })

  repository.save(context.dividas)
}
