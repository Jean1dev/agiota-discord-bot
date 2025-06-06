/**
 * https://crontab.guru/
 */
const { CHAT_GERAL, CANAIS_PARA_LIMPAR } = require('./discord-constants')
const { schedule } = require('./schedules/node-cron')
const context = require('./context').contextInstance
const { 
    getRegistros, 
    clearRegistros,
    rankearUso,
    exibirRankingNoChat,
    myDailyBudgetService, 
    runQuizTask,
    rotinaDiariaCrypto
} = require('./services')

function limparCanais() {
    let channel = context().client.channels.cache.find(channel => channel.name === CHAT_GERAL)
    channel.send('Iniciando tarefa agendada para limpar o canal 🤖').then(msg => {
        msg.delete({ timeout: 60000 })
    })

    const listChannel = CANAIS_PARA_LIMPAR
    for (const channelName of listChannel) {
        channel = context().client.channels.cache.find(channel => channel.name === channelName)
        channel.bulkDelete(30)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages ${new Date()}`))
            .catch((reason) => console.log(reason))
    }
}

function procedimentosDaMadruga() {
    limparCanais()
    rankearUso()
    rotinaDiariaCrypto()
}

function salvarDadosAnalise() {
    const registros = getRegistros()
    if (!registros.length)
        return

    clearRegistros()
}

function registerJobs() {
    // “At minute 0.”
    schedule('0 * * * *', salvarDadosAnalise)

    // “At 23:10.”
    schedule('10 23 * * *', procedimentosDaMadruga)

    // “At 08:35 on Monday.”
    schedule('35 8 * * 1', exibirRankingNoChat)

    // “At 10:15 on Monday.”
    schedule('15 10 * * 1', myDailyBudgetService.gerarReportDosGastosDoUltimoFinalDeSemana)

    // “At 22:05.”
    schedule('5 22 * * *', myDailyBudgetService.dailyHandles)
    
    //“At minute 2 past every 3rd hour from 9 through 19 on every day-of-week from Monday through Thursday.”
    schedule('2 9-19/3 * * 1-4', runQuizTask)
}

module.exports = registerJobs

