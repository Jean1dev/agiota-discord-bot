const { TELEGRAM_API_KEY } = require('../config')

if (!TELEGRAM_API_KEY) {
    return
}

const { Telegraf, session, Markup, Telegram } = require('telegraf')
const { myDailyBudgetService } = require('../services')
const { message } = require('telegraf/filters')

const CHAT_ID = 512142034
const bot = new Telegraf(TELEGRAM_API_KEY)
const telegram = new Telegram(TELEGRAM_API_KEY)
bot.use(session())

let awaitResponseSpentMoney = false

const tecladoOpcoes = Markup.keyboard([
    ['My Daily budget'],
    ['spent money'],
]).resize()

function enviarMensagemParaMim(message) {
    telegram.sendMessage(String(CHAT_ID), message)
}

function enviarMensagemHTML(message, chatID) {
    telegram.sendMessage(chatID, message, { parse_mode: 'HTML' })
        .catch(error => {
            console.log(error)
        })
}

bot.use(async (ctx, next) => {
    const id = ctx.update.message.from.id

    if (id !== CHAT_ID) {
        await ctx.reply('Voce nao tem permissao para acessar esse bot')
        enviarMensagemParaMim(`Usuario desconhecido tentou acessar o bot: ${ctx.update.message.from.first_name}`)
        return
    }

    next()
})

bot.start(async context => {
    let nome = context.update.message.from.first_name
    await context.reply(`*Bom dia ${nome}`)
    await context.replyWithMarkdownV2(`Use os botoes a baixo para uma melhor interacao`, tecladoOpcoes)
})

bot.hears('My Daily budget', async ctx => {
    const budget = await myDailyBudgetService.getMyDailyBudget()
    ctx.reply(`R$ ${budget}`)
})

bot.hears('spent money', ctx => {
    awaitResponseSpentMoney = true
    ctx.reply('informe o valor e descricao separado por virgula')
})

bot.on(message('text'), async ctx => {
    if (!awaitResponseSpentMoney) {
        return
    }

    const content = ctx.update.message.text.split(',')
    const budget = await myDailyBudgetService.spentMoney({ money: content[0], description: content[1] })

    ctx.reply(`your new daily budget is R$ ${budget}`)
    awaitResponseSpentMoney = false
})

bot.launch()

module.exports = {
    enviarMensagemParaMim,
    enviarMensagemHTML
}