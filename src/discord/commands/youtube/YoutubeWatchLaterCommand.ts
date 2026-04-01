import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('YoutubeWatchLaterCommand')
const schema = z.tuple([]).rest(z.string())

const WL_NOT_SUPPORTED_MSG =
  '**A API do YouTube não permite** usar a playlist oficial "Assistir mais tarde" (WL) — isso foi desativado pela Google em 2016. ' +
  'Crie uma playlist sua no YouTube, copie a **URL da playlist** ou só o **ID** (começa com PL) e defina no .env: `YOUTUBE_WATCH_LATER_PLAYLIST_ID=URL ou PLxxx`'

export class YoutubeWatchLaterCommand extends BaseCommand<typeof schema> {
  readonly name = 'yt-wl'
  readonly description = 'Envia vídeos para a playlist Watch Later'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get youtubeService() { return require('../../../services/youtubeRssService') }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get mongoRepo() { return require('../../../repository/mongodb') }

  protected async handle(message: DiscordMessage): Promise<void> {
    const svc = this.youtubeService
    if (!svc.isAuthorized()) {
      await message.reply('YouTube não está autorizado. Use `$yt-auth` antes.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../../config')
    const raw: string = config.YOUTUBE_WATCH_LATER_PLAYLIST_ID
    if (!raw || raw.trim() === 'WL') {
      await message.reply(WL_NOT_SUPPORTED_MSG)
      return
    }

    const docs: any[] = await this.mongoRepo.findYoutubeVideosWatchLater()
    if (!docs.length) {
      await message.reply('Nenhum vídeo com watchLater: true no banco.')
      return
    }

    await message.reply(`Adicionando ${docs.length} vídeo(s) na sua playlist...`)

    let added = 0
    let failed = 0
    for (const doc of docs) {
      try {
        await svc.addToWatchLaterPlaylist(doc.videoId)
        added++
      } catch (err: any) {
        failed++
        log.warn({ err, videoId: doc.videoId }, 'Falha ao adicionar vídeo')
        if (err.message?.includes('does not support the ability to insert')) {
          await message.reply(WL_NOT_SUPPORTED_MSG)
          break
        }
        if (err.message?.includes('Precondition check failed')) {
          await message.reply(
            '**Playlist inválida.** Use o **ID** da playlist (começa com PL) ou a URL completa.'
          )
          break
        }
      }
    }

    await this.mongoRepo.deleteYoutubeVideosCollection()
    await message.reply(`Pronto. ${added} vídeo(s) adicionado(s) à playlist. ${failed} falha(s).`)
  }

  protected getUsage() { return '`$yt-wl`' }
}
