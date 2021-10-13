const context = require('../../context')

module.exports = async message => {
  if (!context.dividas.length) {
    message.reply('Ninguem esta te devendo meu mano')
    return
  }

  context.dividas.forEach(usuarioComDividas => {
    message.channel.send(`Dividas do ${usuarioComDividas.id}`)
    const dividas = usuarioComDividas.pendencias
      .map(divida => `${divida.descricao} : R$${divida.valor}, 00`)
      .join(', ')

    message.channel.send(dividas)

    const totalDivida = usuarioComDividas.pendencias
      .map(divida => Number(divida.valor))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    const pagamentos = usuarioComDividas.pagamentos
      .map(pagamento => `R$${pagamento.valorPago}, 00`)
      .join(', ')

    message.channel.send(`pagamentos, ${pagamentos}`)

    const totalPago = usuarioComDividas.pagamentos
      .map(pagamento => Number(pagamento.valorPago))
      .reduce((total, valorAtual) => total + valorAtual, 0)

    message.channel.send(`Total de : R$${((totalPago - totalDivida) * -1)}`)
  })
}
