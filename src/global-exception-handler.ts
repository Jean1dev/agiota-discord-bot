import captureException from './observability/Sentry'

process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err.message)
    console.error(err.stack)
    captureException(err, true)
    setTimeout(() => {
        process.exit(1)
    }, 1000)
})

process.on('unhandledRejection', (err: unknown) => {
    const e = err as Error
    console.error('Unhandled Rejection at:', e.stack || err)
    captureException(err, true)
})
