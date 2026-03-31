import pino from 'pino'

const isProd = process.env.NODE_ENV === 'prod'

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
export const logger = pino({
  level: isProd ? 'info' : 'debug',
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
