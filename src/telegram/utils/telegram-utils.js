const { Telegram } = require('telegraf')
const { TELEGRAM_API_KEY, AUTHORIZED_CHAT_ID } = require('../config/telegram-config')

const telegram = new Telegram(TELEGRAM_API_KEY)

function enviarMensagemParaMim(message) {
    telegram.sendMessage(String(AUTHORIZED_CHAT_ID), message)
}

function enviarMensagemHTML(message, chatID) {
    telegram.sendMessage(chatID, message, { parse_mode: 'HTML' })
        .catch(error => {
            console.error('[Telegram][enviarMensagemHTML] Erro ao enviar mensagem:', error.message)
        })
}

function isAuthorizedUser(chatId) {
    return chatId === AUTHORIZED_CHAT_ID
}

function enviarMensagemParaUsuario(userId, message) {
    return telegram.sendMessage(String(userId), message)
        .catch(error => {
            console.error(`[Telegram] Erro ao enviar mensagem para userId ${userId}:`, error.message)
        })
}

module.exports = {
    telegram,
    enviarMensagemParaMim,
    enviarMensagemHTML,
    enviarMensagemParaUsuario,
    isAuthorizedUser
}

