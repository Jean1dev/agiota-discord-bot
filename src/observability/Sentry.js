const Sentry = require("@sentry/node");
const { SENTRY_DNS } = require('../config');

if (SENTRY_DNS) {
    Sentry.init({
        dsn: SENTRY_DNS,
        tracesSampleRate: 1.0,
    });
}

function captureException(ex) {
    console.log(ex.message)

    if (ex.isAxiosError) {
        console.log('Http Axios Error ')
        console.log(ex.toJSON())
    }
    
    if (SENTRY_DNS) {
        Sentry.captureException(ex)
        return
    }
}

module.exports = captureException