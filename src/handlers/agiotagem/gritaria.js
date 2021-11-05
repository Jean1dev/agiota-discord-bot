const {
  VoiceConnectionStatus,
  joinVoiceChannel,
  entersState,
} = require('@discordjs/voice')
const createDiscordJSAdapter = require('../../adapters/discord-adapter')
const context = require('../../context')

async function connectToChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    debug: true,
    adapterCreator: createDiscordJSAdapter(channel),
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

module.exports = async message => {
  const channel = message.member?.voice.channel

  if (channel) {
    try {
      const connection = await connectToChannel(channel)
      connection.subscribe(context.player)
      message.reply('OLHA O MAMACO!!!!')
      setTimeout(() => {
        connection.disconnect()
      }, 60000)
    } catch (error) {
      console.error(error)
    }
  } else {
    message.reply('Join a voice channel then try again!')
  }
}
