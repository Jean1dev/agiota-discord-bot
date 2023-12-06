const connectToChannel = require('../../adapters/connect-user-channel')
const path = require('path')
const createListeningStream = require('../../adapters/create-listening-stream')
const { contextInstance: context } = require('../../context')
const audioconcat = require('audioconcat')

const recordable = new Set()
const files = new Set()

function addFile(filename) {
  files.add(filename)
}

function concatAudios() {
  const songs = []
  files.forEach(f => songs.push(f))
  files.clear()

  const filenameOutput = path.resolve(__dirname, `${Date.now()}-all.ogg`)
  context().gravacoes.push(filenameOutput)

  audioconcat(songs)
    .concat(filenameOutput)
    .on('start', function (command) {
      console.log('ffmpeg process started:', command)
    })
    .on('error', function (err, _stdout, stderr) {
      console.error('Error:', err)
      console.error('ffmpeg stderr:', stderr)
    })
    .on('end', function (output) {
      console.error('Audio created in:', filenameOutput)
    })
}

module.exports = async (args, message) => {
  const channel = message.member?.voice.channel
  const timeoutMillis = (args[0] || 6) * 1000
  const client = context().client
  recordable.add(message.author.id)

  if (channel) {
    try {
      const connection = await connectToChannel(channel)
      const receiver = connection.receiver

      receiver.speaking.on('start', (userId) => {
        if (recordable.has(userId)) {
          createListeningStream(receiver, userId, client.users.cache.get(userId), addFile)
        } else {
          createListeningStream(receiver, userId, client.users.cache.get(userId), addFile)
        }
      })

      message.reply({ ephemeral: true, content: 'Listening!' })

      setTimeout(() => {
        connection.disconnect()
        recordable.clear()
        concatAudios()
      }, timeoutMillis)

    } catch (error) {
      console.error(error)
    }
  } else {
    message.reply('Join a voice channel then try again!')
  }
}
