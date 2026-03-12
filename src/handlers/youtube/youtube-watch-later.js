'use strict'

const youtubeRssService = require('../../services/youtubeRssService')
const {
  findYoutubeVideosWatchLater,
  deleteYoutubeVideosCollection
} = require('../../repository/mongodb')

module.exports = async (message) => {
  if (!youtubeRssService.isAuthorized()) {
    return message.reply('YouTube não está autorizado. Use `!agt yt-auth` antes.')
  }

  const docs = await findYoutubeVideosWatchLater()
  if (!docs.length) {
    return message.reply('Nenhum vídeo com watchLater: true no banco.')
  }

  await message.reply(`Adicionando ${docs.length} vídeo(s) na playlist "Assistir mais tarde"...`)

  let added = 0
  let failed = 0
  for (const doc of docs) {
    try {
      await youtubeRssService.addToWatchLaterPlaylist(doc.videoId)
      added++
    } catch (err) {
      failed++
      console.warn('[YouTube WL] falha ao adicionar', doc.videoId, err.message)
    }
  }

  await deleteYoutubeVideosCollection()

  return message.reply(
    `Pronto. ${added} vídeo(s) adicionado(s) à playlist "Assistir mais tarde". ${failed} falha(s). Coleção de vídeos do YouTube no banco foi apagada.`
  )
}
