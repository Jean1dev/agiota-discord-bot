const { MessageEmbed } = require("discord.js")
const context = require('../../context')
const { B3_API_KEY } = require('../../config')
const http = require('https')
const captureException = require('../../observability/Sentry')

function removerPapel(nomePapel) {
  context.acoes = context.acoes.filter(({ papel }) => papel !== nomePapel)
  context.save()
}

function deleteMessageAfterTime(message) {
  setTimeout(() => message.delete(), 10000)
}

module.exports = async message => {
  deleteMessageAfterTime(message)

  const options = {
    method: "GET",
    hostname: "www.alphavantage.co",
    port: null,
    path: '',
  };

  if (!context.acoes.length) {
    message.channel.send(`Nenhum papel salvo`)
    return
  }

  message.channel.send(`pesquisando a ultima cotacao dos papeis`).then(deleteMessageAfterTime)

  context.acoes.forEach(({ papel, image }) => {
    message.channel.send(`\n ${papel}`).then(deleteMessageAfterTime)
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

          const valores = cotacao['Time Series (Daily)'][ultimaCotacaoKeys[0]]
          const high = valores[Object.keys(valores)[1]]
          const close = valores[Object.keys(valores)[3]]
          
          //cotacao['Meta Data'][`3. Last Refreshed`]

          const embed = new MessageEmbed()
            .setTitle(cotacao['Meta Data'][`2. Symbol`])
            .setThumbnail(image)
            .setDescription(`Fechamento: ${close}  maior alta do dia ${high}`)
            .setColor("RANDOM")

          message.channel.send({ embeds: [embed] })
        } catch (error) {
          message.channel.send(`houve um problema para pegar os dados de ${papel}`).then(deleteMessageAfterTime)
          removerPapel(papel)

          captureException(error)
        }
      })
    })

    req.end()
  })

}

