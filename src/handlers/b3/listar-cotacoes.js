const context = require('../../context')
const { B3_API_KEY } = require('../../config')
const http = require('https')

function removerPapel(nomePapel) {
  context.acoes = context.acoes.filter(({ papel }) => papel !== nomePapel)
  context.save()
}

module.exports = async message => {
  const options = {
    method: "GET",
    hostname: "www.alphavantage.co",
    port: null,
    path: '',
  };

  message.channel.send(`pesquisando a ultima cotacao dos papeis`)

  context.acoes.forEach(({ papel }) => {
    message.channel.send(`\n ${papel}`)
    options.path = `/query?function=TIME_SERIES_DAILY&symbol=${papel}.SA&interval=5min&apikey=${B3_API_KEY}`
    const req = http.request(options, (response) => {
      const chunks = [];
      response.on('data', function (chunk) {
        chunks.push(chunk)
      })

      response.on('end', function () {
        const body = Buffer.concat(chunks)
        try {
          const cotacao = JSON.parse(body.toString())
          const ultimaCotacaoKeys = Object.keys(cotacao['Time Series (Daily)'])
          const cotacaoStr = JSON.stringify(cotacao['Time Series (Daily)'][ultimaCotacaoKeys[0]])
          message.channel.send(`${cotacao['Meta Data'][`2. Symbol`]}: ${cotacao['Meta Data'][`3. Last Refreshed`]} \n ${cotacaoStr} }`)
        } catch (error) {
          message.channel.send(`houve um problema para pegar os dados de ${papel}`)
          removerPapel(papel)
        }
      })
    })

    req.end()
  })

}

