const Sentry = require("@sentry/node");
const { SENTRY_DNS } = require('../config');

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    });
}

function captureException(ex) {
    if (SENTRY_DNS) {
        Sentry.captureException(ex)
        return
    }
        
    console.error(ex)
    console.log(ex.message)
}

module.exports = captureException