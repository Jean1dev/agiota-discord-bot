const { TELEGRAM_API_KEY } = require('./config/telegram-config')

if (!TELEGRAM_API_KEY) {
    return
}

const { Telegraf, session } = require('telegraf')
const { registerDailyBudgetHandlers, registerPublicHandlers } = require('./handlers')
const { enviarMensagemParaMim, enviarMensagemHTML, isAuthorizedUser } = require('./utils/telegram-utils')

const authorizedBot = new Telegraf(TELEGRAM_API_KEY)
const publicBot = new Telegraf(TELEGRAM_API_KEY)

authorizedBot.use(session())
publicBot.use(session())

authorizedBot.use(async (ctx, next) => {
    if (ctx.chat.type === 'private') {
        const id = ctx.update.message.from.id

        if (!isAuthorizedUser(id)) {
            return
        }
    }

    next()
})

publicBot.use(async (ctx, next) => {
    if (ctx.chat.type === 'private') {
        const id = ctx.update.message.from.id

        if (isAuthorizedUser(id)) {
            return
        }
    }

    next()
})

registerDailyBudgetHandlers(authorizedBot)
registerPublicHandlers(publicBot)

const bot = new Telegraf(TELEGRAM_API_KEY)
bot.use(session())

bot.use(async (ctx, next) => {
    const isPrivateChat = ctx.chat.type === 'private'
    const chatId = ctx.update.message?.from?.id

    if (isPrivateChat && chatId) {
        if (isAuthorizedUser(chatId)) {
            return authorizedBot.handleUpdate(ctx.update)
        } else {
            return publicBot.handleUpdate(ctx.update)
        }
    }

    next()
})

bot.launch()

module.exports = {
    enviarMensagemParaMim,
    enviarMensagemHTML
}
