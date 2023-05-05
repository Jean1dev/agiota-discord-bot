const googleOAuthState = require('../../adapters/google-Oauth')
const { google } = require('googleapis')

const config = require('../../config')
const appEvents = require('../../app-events')

function askForToken(callback) {
    message.reply('Estou sem o token, autoriza lá e me manda aqui')

    message.reply(`Authorize this app by visiting this url: ${googleOAuthState.authUrl}`, { fetchReply: true })
        .then(() => {
            message.channel.awaitMessages({ max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const code = collected.first().content
                    googleOAuthState.setAuthToken(code).then(callback)

                })
                .catch(() => {
                    message.author.send("Request Denied because you did not responded with a registerd email ID. You can request again!");
                })
        })

    return

}

const state = {
    originalMessage: null,
    valor: null,
    juros: null,
    parcelas: null,
}
const messagesForClean = []

function cleanMessageList() {
    const TIMEOUT = 20000
    setTimeout(() => {
        messagesForClean.forEach(msg => msg.delete({ timeout: TIMEOUT }))
        messagesForClean.splice(0, messagesForClean.length)
    }, TIMEOUT)
}

function awaitResponseThenSendToNext(message, nextFunction, args = null) {
    message.channel.awaitMessages({ max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const content = collected.first().content
            messagesForClean.push(collected.first())
            nextFunction(content, args)
        })
        .catch(e => {
            message.channel.send("Tempo expirou, comece a operacao novamente")
                .then(m => messagesForClean.push(m))
            cleanMessageList()
            console.error(e)
        })
}

function startNewEmprestimo() {
    state.originalMessage.author.send(`
        Acesse o link para fazer o emprestimo \n
        o link expira em 60 minutos \n
        https://caixinha-gilt.vercel.app/emprestimo?user=${state.originalMessage.author.username}&auth=${config.CAIXINHA_KEY}
    `)

    state.originalMessage.reply('enviei um link no seu privado, continue por la').then(m => messagesForClean.push(m))
    cleanMessageList()
    appEvents.emit('notification-emprestimo')
}

function selecionarOperacao(opcao) {
    const convertToNumber = Number(opcao)
    switch (convertToNumber) {
        case 1:
            state.originalMessage.reply('Ainda nao implementendado')
                .then(m => {
                    messagesForClean.push(m)
                    cleanMessageList()
                })
            break;

        case 2:
            startNewEmprestimo()
            break;

        case 3:
            state.originalMessage.reply('Ainda nao implementendado')
                .then(m => {
                    messagesForClean.push(m)
                    cleanMessageList()
                })
            break;

        default:
            break;
    }
}

module.exports = message => {
    message.reply('1-> para deposito, 2-> para emprestimo, 3-> para saldo disponivel', { fetchReply: true })
        .then(m => {
            messagesForClean.push(m)
            awaitResponseThenSendToNext(message, selecionarOperacao)
        })

    state.originalMessage = message
    messagesForClean.push(message)
}