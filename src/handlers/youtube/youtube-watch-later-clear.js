'use strict'

const youtubeRssService = require('../../services/youtubeRssService')
const config = require('../../config')

module.exports = async (message) => {
  if (!youtubeRssService.isAuthorized()) {
    return message.reply('YouTube não está autorizado. Use `!agt yt-auth` antes.')
  }
  const raw = config.YOUTUBE_WATCH_LATER_PLAYLIST_ID
  if (!raw || typeof raw !== 'string' || !raw.trim() || raw.trim() === 'WL') {
    return message.reply(
      'Playlist não configurada. Defina no .env `YOUTUBE_WATCH_LATER_PLAYLIST_ID` com o ID (PL...) ou a URL da playlist.'
    )
  }
  await message.reply('Removendo todos os vídeos da playlist...')
  try {
    const removed = await youtubeRssService.clearWatchLaterPlaylist()
    return message.reply(`Pronto. ${removed} vídeo(s) removido(s) da playlist.`)
  } catch (err) {
    console.warn('[YouTube WL clear]', err.message)
    if (err.message && err.message.includes('Precondition check failed')) {
      return message.reply(
        '**Playlist inválida.** Use no .env o **ID** da playlist (começa com PL) ou a URL completa. Rode `npm run test:yt-playlists` para listar seus IDs.'
      )
    }
    return message.reply(`Erro ao limpar playlist: ${err.message}`)
  }
}
