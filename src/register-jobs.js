/**
 * https://crontab.guru/
 */
const { CHAT_GERAL, CANAIS_PARA_LIMPAR, LIXO_CHANNEL } = require('./discord-constants')
const { schedule } = require('./schedules/node-cron')
const context = require('./context').contextInstance
const { isFeriadoHoje } = require('./utils/feriados-br')
const { saveYoutubeVideos } = require('./repository/mongodb')
const {
    getRegistros,
    clearRegistros,
    rankearUso,
    myDailyBudgetService,
    runQuizTask,
    rotinaDiariaCrypto,
    startAutoArbitrage,
    youtubeRssService,
    sendToChannel
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

function procedimentosDeHoraEmHora() {
    startAutoArbitrage()
    salvarDadosAnalise()
}

function salvarDadosAnalise() {
    const registros = getRegistros()
    if (!registros.length)
        return

    clearRegistros()
}

function registerJobs() {
    // “At minute 0.”
    schedule('0 * * * *', procedimentosDeHoraEmHora)

    // “At 23:10.”
    schedule('10 23 * * *', procedimentosDaMadruga)

    // “At 08:35 on Monday.”
    //schedule('35 8 * * 1', exibirRankingNoChat)

    // “At 11:15 on Monday.”
    schedule('15 11 * * 1', myDailyBudgetService.gerarReportDosGastosDoUltimoFinalDeSemana)

    // “At 22:05.”
    schedule('5 22 * * *', myDailyBudgetService.dailyHandles)
    
    schedule('2 9-19/3 * * 1-3', runQuizTask)

    schedule('16 8 * * 1-6', async function youtubeRssJob() {
        if (await isFeriadoHoje()) return
        try {
            const videos = await youtubeRssService.runAndNotify()
            if (videos.length) await saveYoutubeVideos(videos)
        } catch (err) {
            const msg = `[YouTube RSS] Erro no processamento: ${err.message}`
            console.error(msg, err)
            sendToChannel(LIXO_CHANNEL, msg)
        }
    })
}

module.exports = registerJobs

