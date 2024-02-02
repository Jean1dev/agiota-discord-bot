const captureException = require("./observability/Sentry")

process.on('uncaughtException', function (err) {
    captureException(err)
    process.exit(1) //mandatory (as per the Node.js docs)
})

process.on('unhandledRejection', function (err) { 
    captureException(err)
})
