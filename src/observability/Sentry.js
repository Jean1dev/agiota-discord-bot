const Sentry = require("@sentry/node");
const { SENTRY_DNS } = require('../config');

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    });
}

function captureException(ex) {
    if (SENTRY_DNS)
        Sentry.captureException(ex)

    console.error(ex.message)
}

module.exports = captureException