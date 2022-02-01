const connectToChannel = require('../../adapters/connect-user-channel')
const context = require('../../context')


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
