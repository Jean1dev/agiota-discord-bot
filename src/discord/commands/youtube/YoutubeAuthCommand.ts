import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { createLogger } from '../../../shared/logger/Logger'

const log = createLogger('YoutubeAuthCommand')
const schema = z.tuple([]).rest(z.string())

function extractCodeFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.includes('code=')) {
    try {
      const urlStr = trimmed.startsWith('http') ? trimmed : `http://${trimmed.replace(/^\?/, '')}`
      const url = new URL(urlStr)
      return url.searchParams.get('code')
    } catch {
      const match = trimmed.match(/[?&]code=([^&\s]+)/)
      return match ? match[1]! : null
    }
  }
  return trimmed || null
}

export class YoutubeAuthCommand extends BaseCommand<typeof schema> {
  readonly name = 'yt-auth'
  readonly description = 'Autoriza o bot no YouTube'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private get youtubeService() { return require('../../../services/youtube/YoutubeRssService') }

  protected async handle(message: DiscordMessage): Promise<void> {
    const svc = this.youtubeService
    if (svc.isAuthorized()) {
      await message.reply('YouTube já está autorizado. Vídeos das inscrições serão enviados no horário agendado.')
      return
    }

    const authUrl = svc.getAuthUrl()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../../config')
    if (!authUrl || !config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      await message.reply('Google OAuth não configurado (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env).')
      return
    }

    await message.reply(
      'Abra o link abaixo e autorize. O navegador vai redirecionar para uma página que **não vai carregar** (normal). ' +
      '**Copie a URL inteira da barra de endereços** e cole aqui no chat.'
    )
    await message.reply(authUrl)

    const filter = (m: any) => m.author.id === (message as any).author.id
    try {
      const collected = await (message as any).channel.awaitMessages({
        filter,
        max: 1,
        time: 120000,
        errors: ['time']
      })
      const raw: string = collected.first().content.trim()
      const code = extractCodeFromInput(raw)
      if (!code) {
        await message.reply('Não achei o código. Cole o código ou a URL completa após autorizar.')
        return
      }
      await svc.setAuthToken(code)
      await message.reply('YouTube autorizado. O job das 9h passará a enviar os vídeos das suas inscrições (últimas 24h).')
    } catch (err) {
      log.warn({ err }, 'YouTube auth timeout')
      await message.reply('Tempo esgotado ou cancelado. Use o comando de novo quando quiser autorizar.')
    }
  }

  protected getUsage() { return '`$yt-auth`' }
}
