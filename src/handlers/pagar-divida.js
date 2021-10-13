const context = require('../context')
const repository = require('../repository/operations')

module.exports = async (args, message) => {
  const valorPago = args[1]
  const autor = message.author.id

  context.dividas
    .filter(usuariosComDividas => usuariosComDividas.id === `<@!${autor}>`)
    .forEach(usuariosComDividas => {
      usuariosComDividas.pagamentos.push({
        valorPago,
        data: new Date()
      })

      message.reply(`pagamento feito`)
    })

  repository.save(context.dividas)
}
