import { IJob } from '../IJob'
import { LIXO_CHANNEL } from '../../discord/DiscordConstants'
import { isFeriadoHoje } from '../../shared/utils/feriados-br'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { saveYoutubeVideos } = require('../../repository/mongodb')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { youtubeRssService, sendToChannel } = require('../../services')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appEvents = require('../../app-events')

/**
 * Runs daily at 08:16, Monday to Saturday. Skips Brazilian holidays.
 * Fetches YouTube RSS feed, persists new videos, and sends a Telegram notification.
 */
export class YoutubeRssJob implements IJob {
  readonly cronExpression = '16 8 * * 1-6'

  async run(): Promise<void> {
    if (await isFeriadoHoje()) return
    try {
      const videos = await youtubeRssService.runAndNotify() as unknown[]
      if (videos.length) await saveYoutubeVideos(videos)
      appEvents.emit('enviar-mensagem-telegram', `seus videos estao prontos https://my-youtube-manager.vercel.app/`)
    } catch (err) {
      const msg = `[YouTube RSS] Erro no processamento: ${(err as Error).message}`
      console.error(msg, err)
      sendToChannel(LIXO_CHANNEL, msg)
    }
  }
}
