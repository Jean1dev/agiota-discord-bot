/**
 * https://crontab.guru/
 */
const { schedule } = require('./schedules/node-cron')
const context = require('./context')
const { getRegistros, clearRegistros, rankearUso, exibirRankingNoChat } = require('./services')

function limparCanais() {
    let channel = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
    channel.send('Iniciando tarefa agendada para limpar o canal 🤖-testes-bot').then(msg => {
        msg.delete({ timeout: 40000 })
    })

    const listChannel = ['lixo', 'musica']
    for (const channelName of listChannel) {
        channel = context.client.channels.cache.find(channel => channel.name === channelName)
        channel.bulkDelete(30)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
            .catch((reason) => console.log(reason))
    }
}

function salvarDadosAnalise() {
    const registros = getRegistros()
    if (!registros.length)
        return

    console.log('quantidade de registros', registros.length)
    clearRegistros()
}

function registerJobs() {
    schedule('0 * * * *', salvarDadosAnalise)

    schedule('0 10 * * *', limparCanais)

    //schedule('0 20 * * 0', rankearUso)

    //schedule('0 23 * * 0', exibirRankingNoChat)
}

module.exports = registerJobs

