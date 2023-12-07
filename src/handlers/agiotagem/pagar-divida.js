const context = require('../../context').contextInstance

module.exports = async (args, message) => {
  const valorPago = args[0]
  const autor = message.author.id

  context().dividas
    .filter(usuariosComDividas => usuariosComDividas.id === `<@${autor}>`)
    .forEach(usuariosComDividas => {
      usuariosComDividas.pagamentos.push({
        valorPago,
        data: new Date()
      })

      message.reply(`pagamento feito`)
    })

  context().save()
}
