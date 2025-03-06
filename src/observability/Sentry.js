const Sentry = require("@sentry/node");
const { SENTRY_DNS } = require('../config');

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    });
}

function captureException(ex, alreadyLogged = false) {
    if (ex.isAxiosError) {
        console.error('HTTP Axios Error: ', {
            message: ex.message,
            name: ex.name,
            code: ex.code,
            config: ex.config,
            response: ex.response ? {
            status: ex.response.status,
            statusText: ex.response.statusText,
            headers: ex.response.headers,
            data: ex.response.data
            } : null
        });
    } else if (!alreadyLogged) {
        console.error('Unknown Error: ', {
            message: ex.message,
            name: ex.name,
            stack: ex.stack
        });
    }

    if (SENTRY_DNS) {
        Sentry.captureException(ex)
        return
    }
}

module.exports = captureException