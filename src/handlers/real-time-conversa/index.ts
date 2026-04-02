import connectUserChannel from '../../audio/connect-user-channel'
import ListeningStream from '../../audio/listening-audio-stream'
import { LIXO_CHANNEL } from '../../discord/DiscordConstants'
import { contextInstance } from '../../context'
import { speechToText, textCompletion, textToSpeech } from '../../ia/open-ai-api'
import { runMusicBuffer } from '../music/play-resource-buffer'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { convertOggToMp3 } = require('../../services/cloud-convert')

const listeningUsersId = new Set<string>()
let channelRef: any = null

function logMessageOnLixoChannel(message: string): void {
  const chan = (contextInstance().client.channels.cache as any).find(
    (ch: any) => ch.name === LIXO_CHANNEL
  )
  if (chan) chan.send(message)
}

async function respond(filename: string): Promise<void> {
  try {
    logMessageOnLixoChannel('Convertendo para mp3')
    const resultMp3 = await convertOggToMp3(filename)

    logMessageOnLixoChannel('Executando servico de fala para voz')
    const transcription = await speechToText(resultMp3)

    logMessageOnLixoChannel('Enviando buffer pro gpt')
    const completion = await textCompletion([{ role: 'user', content: transcription }])
    const chatGPTResponse = completion.choices[0]?.message.content.trim() ?? ''

    logMessageOnLixoChannel('Enviado para o servido de texto para fala')
    const audioBuffer = await textToSpeech(chatGPTResponse)

    logMessageOnLixoChannel('Fechou vou tocar o som agora')
    await runMusicBuffer(channelRef, audioBuffer)
  } catch (error: any) {
    logMessageOnLixoChannel(`deu pau :/ ${error.message}`)
    console.error(error)
  }
}

async function listening(connection: any): Promise<void> {
  const receiver = connection.receiver
  const client = contextInstance().client

  receiver.speaking.on('start', (userId: string) => {
    if (listeningUsersId.has(userId)) return
    listeningUsersId.add(userId)
    ListeningStream(receiver, userId, (client as any).users.cache.get(userId), respond)
  })
}

const realTimeConversaHandler = (message: any): void => {
  const channel = message.member?.voice.channel
  if (!channel) {
    message.reply('Join a voice channel then try again!')
    return
  }
  channelRef = channel
  connectUserChannel(channel).then(listening).catch(console.error)
}

export default realTimeConversaHandler
