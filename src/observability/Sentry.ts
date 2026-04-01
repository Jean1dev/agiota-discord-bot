import * as Sentry from '@sentry/node'

const SENTRY_DNS: string | undefined = require('../config').SENTRY_DNS

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
        console.error('HTTP Axios Error: ', {
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
        })
    } else if (!alreadyLogged) {
        console.error('Unknown Error: ', {
            message: err['message'],
            name: err['name'],
            stack: err['stack'],
        })
    }

    if (SENTRY_DNS) {
        Sentry.captureException(ex)
    }
}

export default captureException
