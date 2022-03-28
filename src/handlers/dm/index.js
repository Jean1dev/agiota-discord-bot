module.exports = (message, client) => {
  const channel = client.channels.cache.find(channel => channel.name === '🧵-geral')
  if (channel && channel.send) {
    setTimeout(() => {
      channel.send(message.content)
    }, 2000)
  }
}
