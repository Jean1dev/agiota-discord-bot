/**
 * https://crontab.guru/
 */
const { schedule } = require('./schedules/node-cron')
const context = require('./context').contextInstance
const { getRegistros, clearRegistros, myDailyBudgetService } = require('./services')

function limparCanais() {
    let channel = context().client.channels.cache.find(channel => channel.name === '🧵-geral')
    channel.send('Iniciando tarefa agendada para limpar o canal 🤖-testes-bot').then(msg => {
        msg.delete({ timeout: 40000 })
    })

    const listChannel = ['lixo2', 'musica']
    for (const channelName of listChannel) {
        channel = context().client.channels.cache.find(channel => channel.name === channelName)
        channel.bulkDelete(30)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
            .catch((reason) => console.log(reason))
    }
}

function salvarDadosAnalise() {
    const registros = getRegistros()
    if (!registros.length)
        return

    clearRegistros()
}

function registerJobs() {
    schedule('0 * * * *', salvarDadosAnalise)

    schedule('0 10 * * *', limparCanais)

    schedule('0 20 * * *', () => myDailyBudgetService.dailyHandles())
}

module.exports = registerJobs

