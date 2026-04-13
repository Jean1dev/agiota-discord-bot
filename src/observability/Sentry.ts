import * as Sentry from '@sentry/node'
import { env } from '../config/env'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('Sentry')

const SENTRY_DNS: string | undefined = env.SENTRY_DNS

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    })
}

interface AxiosErrorLike {
    isAxiosError: true
    message: string
    name: string
    code?: string
    config: unknown
    response?: {
        status: number
        statusText: string
        headers: unknown
        data: unknown
    }
}

function captureException(ex: unknown, alreadyLogged = false): void {
    const err = ex as Record<string, unknown>

    if (err['isAxiosError']) {
        const axiosErr = ex as AxiosErrorLike
        log.error({
            message: axiosErr.message,
            name: axiosErr.name,
            code: axiosErr.code,
            config: axiosErr.config,
            response: axiosErr.response
                ? {
                      status: axiosErr.response.status,
                      statusText: axiosErr.response.statusText,
                      headers: axiosErr.response.headers,
                      data: axiosErr.response.data,
                  }
                : null,
        }, 'HTTP Axios Error')
    } else if (!alreadyLogged) {
        log.error({
            message: err['message'],
            name: err['name'],
            stack: err['stack'],
        }, 'Unknown Error')
    }

    if (SENTRY_DNS) {
        Sentry.captureException(ex)
    }
}

export default captureException
