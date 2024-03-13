const captureException = require("./observability/Sentry")

process.on('uncaughtException', function (err) {
    console.log('uncaughtException')
    captureException(err)
    process.exit(1) //mandatory (as per the Node.js docs)
})

process.on('unhandledRejection', function (err) { 
    console.log('unhandledRejection')
    captureException(err)
})
