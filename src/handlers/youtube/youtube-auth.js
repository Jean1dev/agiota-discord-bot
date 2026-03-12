'use strict'

const youtubeRssService = require('../../services/youtubeRssService')

function extractCodeFromInput(input) {
  const trimmed = input.trim()
  if (trimmed.includes('code=')) {
    try {
      const urlStr = trimmed.startsWith('http') ? trimmed : `http://${trimmed.replace(/^\?/, '')}`
      const url = new URL(urlStr)
      return url.searchParams.get('code')
    } catch (_) {
      const match = trimmed.match(/[?&]code=([^&\s]+)/)
      return match ? match[1] : null
    }
  }
  return trimmed || null
}

module.exports = async (message) => {
  if (youtubeRssService.isAuthorized()) {
    return message.reply('YouTube já está autorizado. Vídeos das inscrições serão enviados no horário agendado.')
  }

  const authUrl = youtubeRssService.getAuthUrl()
  const config = require('../../config')
  if (!authUrl || !config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return message.reply('Google OAuth não configurado (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env).')
  }

  await message.reply(
    'Abra o link abaixo e autorize. O navegador vai redirecionar para uma página que **não vai carregar** (normal). ' +
    '**Copie a URL inteira da barra de endereços** e cole aqui no chat.'
  )
  await message.reply(authUrl)

  const filter = (m) => m.author.id === message.author.id
  try {
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 120000,
      errors: ['time']
    })
    const raw = collected.first().content.trim()
    const code = extractCodeFromInput(raw)
    if (!code) {
      return message.reply('Não achei o código. Cole o código que apareceu na página após autorizar (ou a URL completa se tiver redirecionado).')
    }
    await youtubeRssService.setAuthToken(code)
    return message.reply('YouTube autorizado. O job das 9h passará a enviar os vídeos das suas inscrições (últimas 24h).')
  } catch (err) {
    return message.reply('Tempo esgotado ou cancelado. Use o comando de novo quando quiser autorizar.')
  }
}
