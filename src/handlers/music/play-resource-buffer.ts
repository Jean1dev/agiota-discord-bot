import fs from 'fs'
import path from 'path'
import {
  entersState,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
} from '@discordjs/voice'
import connectUserChannel from '../../audio/connect-user-channel'
import audioPlayer from '../../audio/audio-player'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('PlayResourceBuffer')

async function playMusicByBuffer(buffer: Buffer): Promise<void> {
  const speechFile = path.resolve('./speech.mp3')
  await fs.promises.writeFile(speechFile, buffer)

  const resource = createAudioResource(speechFile, {
    inputType: StreamType.Arbitrary,
  })

  audioPlayer.play(resource)
  await entersState(audioPlayer, AudioPlayerStatus.Playing, 5000)
}

export async function runMusicBuffer(channel: any, buffer: Buffer): Promise<void> {
  try {
    const connection = await connectUserChannel(channel)
    await playMusicByBuffer(buffer)
    connection.subscribe(audioPlayer)
  } catch (error) {
    log.error({ err: error }, 'Erro ao reproduzir buffer de áudio')
  }
}
