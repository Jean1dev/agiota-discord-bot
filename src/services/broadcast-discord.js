const { contextInstance } = require("../context");
const { ALERT_CHANNEL } = require("../discord-constants");

function sendToChannel(channelName, message) {
  const client = contextInstance().client
  if (!client || !client.guilds) return
  client.guilds.cache.forEach((guild) => {
    const channel = guild.channels.cache.find((ch) => ch.name === channelName)
    if (channel) channel.send(message).catch(() => {})
  })
}

function broadcastDiscord(message) {
  sendToChannel(ALERT_CHANNEL, message)
}

module.exports = {
  broadcastDiscord,
  sendToChannel
}