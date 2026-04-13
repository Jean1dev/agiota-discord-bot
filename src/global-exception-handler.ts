import captureException from './observability/Sentry'
import { createLogger } from './shared/logger/Logger'

const log = createLogger('GlobalExceptionHandler')

process.on('uncaughtException', (err: Error) => {
    log.error({ err }, 'Uncaught Exception')
    captureException(err, true)
    setTimeout(() => {
        process.exit(1)
    }, 1000)
})

process.on('unhandledRejection', (err: unknown) => {
    log.error({ err }, 'Unhandled Rejection')
    captureException(err, true)
})
