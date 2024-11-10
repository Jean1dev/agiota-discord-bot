const { contextInstance } = require("../context");
const { ALERT_CHANNEL } = require("../discord-constants");

function broadcastDiscord(message) {
  const client = contextInstance().client
  const guilds = client.guilds.cache
  guilds.forEach(guild => {
    client.guilds.cache.get(guild.id).channels.cache.forEach(channel => {
      if (channel.name === ALERT_CHANNEL) {
        channel.send(message)
      }
    })
  })
}

module.exports = {
  broadcastDiscord
}