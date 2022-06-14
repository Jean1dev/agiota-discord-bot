const { schedule } = require('./schedules/node-cron')
const context = require('./context')
const captureException = require('./observability/Sentry')

function registerJobs() {

    schedule('0 8 * * *', () => {
        let channel = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
        channel.send('Iniciando tarefa agendada para limpar o canal 🤖-testes-bot')
        channel = context.client.channels.cache.find(channel => channel.name === '🤖-testes-bot')
        channel.bulkDelete(50)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
            .catch(captureException)
    })
}

module.exports = registerJobs

