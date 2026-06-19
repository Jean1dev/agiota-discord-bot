import pino from 'pino'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Logger centralizado com níveis e formato estruturado.
 *
 * Em dev: saída colorida e legível (pino-pretty).
 * Em prod: JSON puro, pronto para ingestão em ferramentas de observabilidade.
 *
 * Uso:
 *   logger.info({ userId }, 'Comando executado')
 *   logger.error({ err, command }, 'Falha ao processar comando')
 *   logger.warn({ channel }, 'Canal não encontrado')
 *   logger.debug({ data }, 'Payload recebido')
 */
/**
 * Campos que podem carregar segredos quando um erro HTTP é logado.
 *
 * Clients como gaxios/googleapis e axios anexam `config.data`/`config.body` ao
 * objeto de erro — e essas strings contêm `client_secret`, `refresh_token`,
 * tokens de acesso e o header Authorization. Sem isso, um `log.error({ err })`
 * despeja credenciais em texto claro nos logs (ex.: refresh do OAuth do Google).
 */
const REDACT_PATHS = [
  'err.config.data',
  'err.config.body',
  'err.config.headers.authorization',
  'err.config.headers.Authorization',
  'err.response.config.data',
  'err.response.config.body',
  'err.response.data',
  'err.request.body',
  'err.request.headers.authorization',
  'err.request.headers.Authorization',
]

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  transport: !isProd
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

/**
 * Cria um logger filho com contexto fixo — útil para isolar logs por módulo.
 *
 * Exemplo:
 *   const log = createLogger('DebtUseCase')
 *   log.info({ userId }, 'Dívida adicionada')
 *   // → { module: 'DebtUseCase', userId: '...', msg: 'Dívida adicionada' }
 */
export function createLogger(module: string) {
  return logger.child({ module })
}
