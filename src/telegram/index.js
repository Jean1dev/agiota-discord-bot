const { TELEGRAM_API_KEY } = require('../config')

if (!TELEGRAM_API_KEY) {
    return
}

const { Telegraf, session, Markup, Telegram } = require('telegraf')
const { myDailyBudgetService } = require('../services')
const { contextInstance } = require('../context')

const bot = new Telegraf(TELEGRAM_API_KEY)
bot.use(session())

let awaitResponseSpentMoney = false

const tecladoOpcoes = Markup.keyboard([
    ['My Daily budget'],
    ['spent money'],
]).resize()

function enviarMessageRef(chatId, message) {
    new Telegram(TELEGRAM_API_KEY)
        .sendMessage(chatId, message)
}

bot.start(async context => {
    let nome = context.update.message.from.first_name
    await context.reply(`*Bom dia ${nome}`)
    await context.replyWithMarkdownV2(`Use os botoes a baixo para uma melhor interacao`, tecladoOpcoes)
})

bot.hears('My Daily budget', async ctx => {
    const budget = await myDailyBudgetService.getMyDailyBudget()
    ctx.reply(`R$ ${budget}`)
    contextInstance().addTelegramId(ctx.update.message.from.id, enviarMessageRef)
})

bot.hears('spent money', ctx => {
    awaitResponseSpentMoney = true
    ctx.reply('informe o valor e descricao separado por virgula')
    contextInstance().addTelegramId(ctx.update.message.from.id, enviarMessageRef)
})

bot.on('text', async ctx => {
    if (!awaitResponseSpentMoney) {
        return
    }

    const content = ctx.update.message.text.split(',')
    const budget = await myDailyBudgetService.spentMoney({ money: content[0], description: content[1] })
    
    ctx.reply(`your new daily budget is R$ ${budget}`)
    awaitResponseSpentMoney = false
    contextInstance().addTelegramId(ctx.update.message.from.id, enviarMessageRef)
})

bot.launch()