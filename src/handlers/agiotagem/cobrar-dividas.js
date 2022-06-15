const context = require('../../context')
const eviarEmailComAnexo = require('../../services/enviarEmailCobranca')

module.exports = async message => {
  if (!context.dividas.length) {
    message.reply('Ninguem esta te devendo meu mano')
    return
  }

  eviarEmailComAnexo()

  context.dividas.forEach(usuarioComDividas => {
    
    const dividas = usuarioComDividas.pendencias
      .map(divida => `${divida.descricao} : R$${divida.valor}, 00 - deve para ${divida?.quemEmprestouDinheiro}`)
      .join(', ')

    const totalDivida = usuarioComDividas.pendencias
      .map(divida => Number(divida.valor))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    const pagamentos = usuarioComDividas.pagamentos
      .map(pagamento => `R$${pagamento.valorPago}, 00`)
      .join(', ')

    const totalPago = usuarioComDividas.pagamentos
      .map(pagamento => Number(pagamento.valorPago))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    const total = ((totalPago - totalDivida) * -1)

    if (total > 0) {
      message.channel.send(`Dividas do ${usuarioComDividas.id}`)
      message.channel.send(dividas)
      message.channel.send(`pagamentos, ${pagamentos}`)
      message.channel.send(`Total de : R$${total}`)
    }

  })
}
