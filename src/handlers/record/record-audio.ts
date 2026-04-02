import path from 'path'
import { contextInstance } from '../../context'
import connectUserChannel from '../../audio/connect-user-channel'
import ListeningStream from '../../audio/listening-audio-stream'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const audioconcat = require('audioconcat')

const recordable = new Set<string>()
const files = new Set<string>()

function addFile(filename: string): void {
  files.add(filename)
}

function concatAudios(): void {
  const songs: string[] = []
  files.forEach(f => songs.push(f))
  files.clear()

  const filenameOutput = path.resolve(__dirname, `${Date.now()}-all.ogg`)
  contextInstance().gravacoes.push(filenameOutput)

  audioconcat(songs)
    .concat(filenameOutput)
    .on('start', (command: string) => console.log('ffmpeg process started:', command))
    .on('error', (err: Error, _stdout: unknown, stderr: string) => {
      console.error('Error:', err)
      console.error('ffmpeg stderr:', stderr)
    })
    .on('end', () => console.log('✅ Audio created in:', filenameOutput))
}

const recordAudioHandler = async (args: string[], message: any): Promise<void> => {
  const channel = message.member?.voice.channel
  const timeoutMillis = (Number(args[0]) || 6) * 1000
  const client = contextInstance().client
  recordable.add(message.author.id)

  if (channel) {
    try {
      const connection = await connectUserChannel(channel)
      const receiver = connection.receiver

      receiver.speaking.on('start', (userId: string) => {
        if (recordable.has(userId)) {
          console.log('nao gravar o autor do comando')
        } else {
          ListeningStream(receiver, userId, (client as any).users.cache.get(userId), addFile)
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

export default recordAudioHandler
