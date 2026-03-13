'use strict'

const youtubeRssService = require('../../services/youtubeRssService')
const {
  findYoutubeVideosWatchLater,
  deleteYoutubeVideosCollection
} = require('../../repository/mongodb')
const config = require('../../config')

const WL_NOT_SUPPORTED_MSG =
  '**A API do YouTube não permite** usar a playlist oficial "Assistir mais tarde" (WL) — isso foi desativado pela Google em 2016. ' +
  'Crie uma playlist sua no YouTube, copie a **URL da playlist** ou só o **ID** (começa com PL) e defina no .env: `YOUTUBE_WATCH_LATER_PLAYLIST_ID=URL ou PLxxx`'

module.exports = async (message) => {
  if (!youtubeRssService.isAuthorized()) {
    return message.reply('YouTube não está autorizado. Use `!agt yt-auth` antes.')
  }

  const raw = config.YOUTUBE_WATCH_LATER_PLAYLIST_ID
  if (!raw || raw.trim() === 'WL') {
    return message.reply(WL_NOT_SUPPORTED_MSG)
  }

  const docs = await findYoutubeVideosWatchLater()
  if (!docs.length) {
    return message.reply('Nenhum vídeo com watchLater: true no banco.')
  }

  await message.reply(`Adicionando ${docs.length} vídeo(s) na sua playlist...`)

  let added = 0
  let failed = 0
  for (const doc of docs) {
    try {
      await youtubeRssService.addToWatchLaterPlaylist(doc.videoId)
      added++
    } catch (err) {
      failed++
      console.warn('[YouTube WL] falha ao adicionar', doc.videoId, err.message)
      if (err.message && err.message.includes('does not support the ability to insert')) {
        await message.reply(WL_NOT_SUPPORTED_MSG)
        break
      }
      if (err.message && err.message.includes('Precondition check failed')) {
        await message.reply(
          '**Playlist inválida.** Use no .env o **ID** da playlist (começa com PL) ou a URL completa: `https://www.youtube.com/playlist?list=PLxxx`. Rode `npm run test:yt-playlists` para listar seus IDs.'
        )
        break
      }
    }
  }

  await deleteYoutubeVideosCollection()

  return message.reply(
    `Pronto. ${added} vídeo(s) adicionado(s) à playlist. ${failed} falha(s). Coleção de vídeos do YouTube no banco foi apagada.`
  )
}
