import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('YoutubeWatchLaterClearCommand')
const schema = z.tuple([]).rest(z.string())

export class YoutubeWatchLaterClearCommand extends BaseCommand<typeof schema> {
  readonly name = 'yt-clear'
  readonly description = 'Remove todos os vídeos da playlist configurada'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get youtubeService() { return require('../../../services/youtubeRssService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    const svc = this.youtubeService
    if (!svc.isAuthorized()) {
      await message.reply('YouTube não está autorizado. Use `$yt-auth` antes.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../../config')
    const raw: string = config.YOUTUBE_WATCH_LATER_PLAYLIST_ID
    if (!raw || typeof raw !== 'string' || !raw.trim() || raw.trim() === 'WL') {
      await message.reply(
        'Playlist não configurada. Defina no .env `YOUTUBE_WATCH_LATER_PLAYLIST_ID` com o ID (PL...) ou a URL da playlist.'
      )
      return
    }

    await message.reply('Removendo todos os vídeos da playlist...')
    try {
      const removed: number = await svc.clearWatchLaterPlaylist()
      await message.reply(`Pronto. ${removed} vídeo(s) removido(s) da playlist.`)
    } catch (err: any) {
      log.warn({ err }, 'Erro ao limpar playlist')
      if (err.message?.includes('Precondition check failed')) {
        await message.reply(
          '**Playlist inválida.** Use no .env o **ID** da playlist (começa com PL) ou a URL completa.'
        )
        return
      }
      await message.reply(`Erro ao limpar playlist: ${err.message}`)
    }
  }

  protected getUsage() { return '`$yt-clear`' }
}
