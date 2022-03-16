const audioHandler = require('../agiotagem/gritaria')

module.exports = (message, client) => {
  const channel = client.channels.cache.find(channel => channel.name === '🧵-geral')
  if (channel && channel.send) {

    if (message.content === 'audio') {
      return audioHandler(message)
    }

    setTimeout(() => {
      channel.send(message.content)
    }, 2000)
  }
}
