/**
 * https://crontab.guru/
 */
const { schedule } = require('./schedules/node-cron')
const context = require('./context')
const captureException = require('./observability/Sentry')
const { getRegistros, clearRegistros, rankearUso, exibirRankingNoChat } = require('./services')
const { client: MongoClient, DATABASE } = require('./repository/mongodb')

function registerJobs() {

    schedule('0 10 * * *', () => {
        let channel = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
        channel.send('Iniciando tarefa agendada para limpar o canal 🤖-testes-bot').then(msg => {
            msg.delete({ timeout: 20000 })
        })
        channel = context.client.channels.cache.find(channel => channel.name === 'lixo')
        channel.bulkDelete(30)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
            .catch(captureException)
    })

    schedule('0 * * * *', () => {
        console.info('salvar analise dados job')
        const registros = getRegistros()
        if (!registros.length)
            return

        MongoClient.connect().then(client => {
            client.db(DATABASE)
                .collection('analise_dados_usuarios')
                .insertMany(registros)
                .finally(() => {
                    client.close()
                    clearRegistros()
                })
        })
    })

    schedule('0 20 * * 0', rankearUso)

    schedule('0 23 * * 0', exibirRankingNoChat)
}

module.exports = registerJobs

