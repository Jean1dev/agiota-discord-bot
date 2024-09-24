const { CHAT_GERAL } = require("../../discord-constants")

module.exports = (message, client) => {
  const channel = client.channels.cache.find(channel => channel.name === CHAT_GERAL)
  if (channel && channel.send) {
    setTimeout(() => {
      channel.send(message.content)
    }, 2000)
  }
}
