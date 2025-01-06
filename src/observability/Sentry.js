const Sentry = require("@sentry/node");
const { SENTRY_DNS } = require('../config');

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    });
}

function captureException(ex) {
    if (ex.isAxiosError) {
        console.log('Http Axios Error ')
        console.log(ex.toJSON())
    } else {
        console.log(ex.message)
    }

    if (SENTRY_DNS) {
        Sentry.captureException(ex)
        return
    }
}

module.exports = captureException