/**
 * Regressão de segurança: o objeto de erro do gaxios/axios anexa
 * `config.data`/`config.body` (com client_secret, refresh_token e Authorization).
 * Um `log.error({ err })` vazava essas credenciais em texto claro nos logs.
 *
 * Valida os REDACT_PATHS reais usados pelo logger central contra um pino
 * com destino em memória.
 */
import { Writable } from 'stream'
import pino from 'pino'
import { REDACT_PATHS } from '../../../../src/shared/logger/Logger'

function captureLogger() {
  let buffer = ''
  const sink = new Writable({
    write(chunk, _enc, cb) {
      buffer += chunk.toString()
      cb()
    },
  })
  const logger = pino(
    { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
    sink
  )
  return { logger, output: () => buffer }
}

describe('Logger redaction de credenciais em erros HTTP', () => {
  const SECRET = 'GOCSPX-super-secret'
  const REFRESH = '1//05refreshtokenleak'

  function gaxiosLikeError() {
    const err = new Error('Invalid response body ... Premature close') as Error & {
      config: Record<string, unknown>
    }
    err.config = {
      data: `refresh_token=${REFRESH}&client_secret=${SECRET}&grant_type=refresh_token`,
      body: `refresh_token=${REFRESH}&client_secret=${SECRET}`,
      headers: { authorization: 'Bearer leaked-token', Authorization: 'Bearer leaked-token' },
    }
    return err
  }

  it('redige config.data, config.body e Authorization', () => {
    const { logger, output } = captureLogger()
    logger.error({ err: gaxiosLikeError(), videoId: 'abc' }, 'Falha ao adicionar vídeo')

    const log = JSON.parse(output())
    expect(log.err.config.data).toBe('[REDACTED]')
    expect(log.err.config.body).toBe('[REDACTED]')
    expect(log.err.config.headers.authorization).toBe('[REDACTED]')
    expect(log.err.config.headers.Authorization).toBe('[REDACTED]')
  })

  it('nenhuma credencial aparece em texto claro na saída', () => {
    const { logger, output } = captureLogger()
    logger.error({ err: gaxiosLikeError() }, 'Falha ao adicionar vídeo')

    const raw = output()
    expect(raw).not.toContain(SECRET)
    expect(raw).not.toContain(REFRESH)
    expect(raw).not.toContain('leaked-token')
  })

  it('preserva campos não sensíveis (videoId e msg)', () => {
    const { logger, output } = captureLogger()
    logger.error({ err: gaxiosLikeError(), videoId: 'abc123' }, 'Falha ao adicionar vídeo')

    const log = JSON.parse(output())
    expect(log.videoId).toBe('abc123')
    expect(log.msg).toBe('Falha ao adicionar vídeo')
  })
})
