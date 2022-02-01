const connectToChannel = require('../../adapters/connect-user-channel')
const path = require('path')
const createListeningStream = require('../../adapters/create-listening-stream')
const context = require('../../context')
const audioconcat = require('audioconcat')
//const ffmpeg = require('ffmpeg')

const recordable = new Set()
const files = new Set()

function convertAudioToMp3(filename) {
  // const process = new ffmpeg(filename)
  // process.then((audio) => {
  //   audio.fnExtractSoundToMP3(path.resolve(__dirname, 'file.mp3'), (error, file) => {
  //     if (!error) {
  //       console.log('Audio File ' + file)
  //     } else {
  //       console.log('Error on fnExtractSoundToMP3', error.message)
  //     }

  //   })
  // })
  files.add(filename)
}

function concatAudios() {
  const songs = []
  files.forEach(f => songs.push(f))
  files.clear()

  audioconcat(songs)
    .concat(path.resolve(__dirname, 'all.ogg'))
    .on('start', function (command) {
      console.log('ffmpeg process started:', command)
    })
    .on('error', function (err, stdout, stderr) {
      console.error('Error:', err)
      console.error('ffmpeg stderr:', stderr)
    })
    .on('end', function (output) {
      console.error('Audio created in:', output)
    })
}

module.exports = async (args, message) => {
  const channel = message.member?.voice.channel
  const timeoutMillis = args[1] || 60000
  const client = context.client
  recordable.add(message.author.id)

  if (channel) {
    try {
      const connection = await connectToChannel(channel)
      const receiver = connection.receiver

      receiver.speaking.on('start', (userId) => {
        if (recordable.has(userId)) {
          createListeningStream(receiver, userId, client.users.cache.get(userId), convertAudioToMp3)
        } else {
          createListeningStream(receiver, userId, client.users.cache.get(userId), convertAudioToMp3)
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
