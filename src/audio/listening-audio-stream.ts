import { pipeline } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice'
import path from 'path'
import { createLogger } from '../shared/logger/Logger'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prism = require('prism-media')

const log = createLogger('ListeningStream')

interface DiscordUser {
  username: string
  discriminator: string
}

function getDisplayName(userId: string, user?: DiscordUser): string {
  return user ? `${user.username}_${user.discriminator}` : userId
}

export function ListeningStream(
  connectionReceiver: VoiceReceiver,
  userId: string,
  user: DiscordUser | undefined,
  callback: (filename: string) => void = () => { }
): void {
  const opusStream = connectionReceiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 100,
    },
  })

  const oggStream = new prism.opus.OggLogicalBitstream({
    opusHead: new prism.opus.OpusHead({
      channelCount: 2,
      sampleRate: 48000,
    }),
    pageSizeControl: {
      maxPackets: 10,
    },
  })

  const filename = path.resolve(__dirname, `audio-${Date.now()}-${getDisplayName(userId, user)}.ogg`)
  const out = createWriteStream(filename)

  log.info({ filename }, 'Started recording')

  pipeline(opusStream, oggStream, out, (err) => {
    if (err) {
      log.warn({ err, filename }, 'Error recording file')
    } else {
      callback(filename)
    }
  })
}

export default ListeningStream
