const path = require('path')
const { contextInstance: context } = require('../../context')
const audioconcat = require('audioconcat')
const connectUserChannel = require('../../audio/connect-user-channel')
const ListeningStream = require('../../audio/listening-audio-stream')

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
    .on('end', function (_) {
      console.log('✅ Audio created in:', filenameOutput)
    })
}

module.exports = async (args, message) => {
  const channel = message.member?.voice.channel
  const timeoutMillis = (args[0] || 6) * 1000
  const client = context().client
  recordable.add(message.author.id)

  if (channel) {
    try {
      const connection = await connectUserChannel(channel)
      const receiver = connection.receiver

      receiver.speaking.on('start', (userId) => {
        if (recordable.has(userId)) {
          //ListeningStream(receiver, userId, client.users.cache.get(userId), addFile)
          console.log('nao gravar o autor do comando')
        } else {
          ListeningStream(receiver, userId, client.users.cache.get(userId), addFile)
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
