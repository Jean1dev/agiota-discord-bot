const context = require('../../context')
const { CAIXINHA_SERVER_URL } = require('../../config')
const axios = require('axios')
const captureException = require('../../observability/Sentry')

function buscarDividasNaCaixinha(message) {
  const url = `${CAIXINHA_SERVER_URL}/report-dividas-pendentes?code=Q47dylJAkJc3xSGB2RNiBkLzLms-lhvWFbyRE4qrlCriAzFuN_CxsA==&clientId=default`
  axios.default.get(url)
    .then(({ data }) => {
      data.forEach(item => {
        item.report.forEach(dividas => {
          const name = dividas.member.name
          const value = dividas.valuePending.value
          message.channel.send(`${name} esta devendo R$${value.toFixed(2)} para a caixinha, pague a conta veiaco`)
        })
      })

    }).catch(captureException)
}

module.exports = async message => {
  buscarDividasNaCaixinha(message)

  if (!context.dividas.length) {
    message.reply('Ninguem esta te devendo meu mano')
    return
  }
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
