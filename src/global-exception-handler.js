const captureException = require("./observability/Sentry")

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message)
    console.error(err.stack)

    captureException(err, true)
    setTimeout(() => {
        process.exit(1) //mandatory (as per the Node.js docs)
    }, 1000)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection at:', err.stack || err)

    captureException(err, true)
})
