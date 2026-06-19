import { createAudioResource, demuxProbe } from '@discordjs/voice'
import { createLogger } from '../../shared/logger/Logger'
import { ytdlpCommonOptions } from './ytdlp-options'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exec } = require('youtube-dl-exec')

const log = createLogger('Track')

const noop = (): void => { }

interface TrackMethods {
  onStart(): void
  onFinish(): void
  onError(error: Error): void
}

interface TrackOptions extends TrackMethods {
  url: string
  title: string
}

export class Track {
  url: string
  title: string
  onStart: () => void
  onFinish: () => void
  onError: (error: Error) => void

  constructor({ url, title, onStart, onFinish, onError }: TrackOptions) {
    this.url = url
    this.title = title
    this.onStart = onStart
    this.onFinish = onFinish
    this.onError = onError
  }

  createAudioResource(): Promise<ReturnType<typeof createAudioResource>> {
    return new Promise((resolve, reject) => {
      const process = exec(
        this.url,
        {
          output: '-',
          quiet: true,
          format: 'bestaudio[ext=webm]/bestaudio/best',
          ...ytdlpCommonOptions(),
        },
        { stdio: ['ignore', 'pipe', 'pipe'] },
      )
      if (!process.stdout) { reject(new Error('No stdout')); return }
      const stream = process.stdout
      const onError = (error: Error): void => {
        if (!process.killed) process.kill()
        log.error({ err: error }, 'Audio resource error')
        stream.resume()
        reject(error)
      }
      process
        .once('spawn', () => {
          demuxProbe(stream)
            .then((probe: any) => resolve(createAudioResource(probe.stream, { metadata: this as any, inputType: probe.type })))
            .catch(onError)
        })
        .on('error', onError)
    })
  }

  static async from(url: string, methods: TrackMethods): Promise<Track> {
    let title = 'Unknown Title'
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const ytInfo = await exec(url, {
          dumpSingleJson: true,
          preferFreeFormats: true,
          ...ytdlpCommonOptions(),
        }, { stdio: ['ignore', 'pipe', 'pipe'] })

        const data = JSON.parse(ytInfo.stdout.toString())
        title = data.title ?? 'Unknown Title'
        break
      } catch (error: any) {
        retryCount++
        log.warn({ err: error, stderr: error.stderr ?? '', exitCode: error.exitCode, retryCount }, `youtube-dl-exec attempt ${retryCount} failed`)
        if (retryCount >= maxRetries) throw new Error('Failed to get video information. Please try again later.')
        await new Promise(r => setTimeout(r, 1000 * retryCount))
      }
    }

    const wrappedMethods: TrackMethods = {
      onStart() { wrappedMethods.onStart = noop; methods.onStart() },
      onFinish() { wrappedMethods.onFinish = noop; methods.onFinish() },
      onError(error) { wrappedMethods.onError = noop; methods.onError(error) },
    }

    return new Track({ title, url, ...wrappedMethods })
  }
}

export default Track
