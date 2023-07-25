const context = require('../../context')
const Scraper = require('images-scraper')
const captureException = require('../../observability/Sentry')

const google = new Scraper({
  puppeteer: {
    headless: false,
  },
})

function deleteMessageAfterTime(message) {
  setTimeout(() => message.delete(), 10000)
}

module.exports = async (args, message) => {
  const papel = args[0]
  message.reply('momentinho ja vou adicionar').then(deleteMessageAfterTime)

  try {
    const results = await google.scrape(papel, 200)

    message.channel.send('Adicionado').then(deleteMessageAfterTime)

    context.acoes.push({
      papel,
      image: results[0]['url']
    })

    context.save()
  } catch (error) {
    captureException(error)
    message.channel.send('Nao consegui adicionar esse papel')
  }

  deleteMessageAfterTime(message)
}
