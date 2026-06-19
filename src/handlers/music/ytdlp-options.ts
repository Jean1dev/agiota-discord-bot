import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('ytdlp-options')

/**
 * User-Agent de um Chrome desktop recente. Mantido fixo para que o client
 * `web`/`web_safari` do yt-dlp pareça um navegador real.
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Lista de player clients usada na extração.
 *
 * IMPORTANTE: os clients `android`/`ios` passaram a exigir PO token e, em IPs
 * de datacenter (Heroku/VPS), disparam o muro "Sign in to confirm you're not a
 * bot". Os clients `tv` e `web_safari` são os mais resilientes hoje sem PO
 * token. Quando há cookies de uma conta logada, o `web` volta a funcionar.
 *
 * Pode ser sobrescrito via `YTDLP_PLAYER_CLIENT` (ex.: "default", "tv,web").
 */
const DEFAULT_PLAYER_CLIENT = 'tv,web_safari'

let cachedCookiesFile: string | null | undefined

/**
 * Resolve, uma única vez, o caminho do arquivo de cookies a partir das envs:
 *
 *  - `YOUTUBE_COOKIES_FILE`: caminho de um cookies.txt já existente no disco.
 *  - `YOUTUBE_COOKIES_B64`:  conteúdo do cookies.txt codificado em base64
 *                           (prático para Heroku/config vars). É escrito em um
 *                           arquivo temporário no boot.
 *
 * Retorna `null` quando nenhuma das duas está definida (extração sem cookies).
 */
function resolveCookiesFile(): string | null {
  if (cachedCookiesFile !== undefined) return cachedCookiesFile

  const explicitPath = process.env.YOUTUBE_COOKIES_FILE?.trim()
  if (explicitPath) {
    log.info({ path: explicitPath }, 'Usando cookies do YouTube via YOUTUBE_COOKIES_FILE')
    cachedCookiesFile = explicitPath
    return cachedCookiesFile
  }

  const b64 = process.env.YOUTUBE_COOKIES_B64?.trim()
  if (b64) {
    try {
      const content = Buffer.from(b64, 'base64').toString('utf8')
      const dir = mkdtempSync(join(tmpdir(), 'ytdlp-cookies-'))
      const file = join(dir, 'cookies.txt')
      writeFileSync(file, content, { mode: 0o600 })
      log.info({ path: file }, 'Cookies do YouTube materializados a partir de YOUTUBE_COOKIES_B64')
      cachedCookiesFile = file
      return cachedCookiesFile
    } catch (err) {
      log.error({ err }, 'Falha ao decodificar YOUTUBE_COOKIES_B64 — seguindo sem cookies')
    }
  }

  cachedCookiesFile = null
  return cachedCookiesFile
}

/**
 * Opções comuns do yt-dlp compartilhadas entre `Track.from` (metadados) e
 * `Track.createAudioResource` (stream de áudio). Inclui cookies quando
 * configurados — a forma confiável de driblar o anti-bot em IP de datacenter.
 */
export function ytdlpCommonOptions(): Record<string, unknown> {
  const playerClient = process.env.YTDLP_PLAYER_CLIENT?.trim() || DEFAULT_PLAYER_CLIENT

  const options: Record<string, unknown> = {
    noWarnings: true,
    extractorArgs: `youtube:player_client=${playerClient}`,
    addHeader: [`User-Agent:${USER_AGENT}`],
  }

  const cookiesFile = resolveCookiesFile()
  if (cookiesFile) options.cookies = cookiesFile

  return options
}

/** Indica se há cookies configurados (para diagnóstico/log). */
export function hasCookiesConfigured(): boolean {
  return resolveCookiesFile() !== null
}
