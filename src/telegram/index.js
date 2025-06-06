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

const state = {
    awaitResponseSpentMoney: false,
    batchResponse: false,
    batchInserts: []
}

const tecladoOpcoes = Markup.keyboard([
    ['My Daily budget'],
    ['spent money'],
    ['batch'],
]).resize()

function enviarMensagemParaMim(message) {
    telegram.sendMessage(String(CHAT_ID), message)
}

function handleBatchResponse(ctx, content) {
    if (content[0].toLowerCase() === 'fim') {
        state.awaitResponseSpentMoney = false
        state.batchResponse = false

        const budget = myDailyBudgetService.batchInsert(state.batchInserts)
        const batchSummary = state.batchInserts.map(item => `- R$ ${item.money}: ${item.description}`).join('\n');

        ctx.reply(`Batch summary:\n${batchSummary}`);
        ctx.reply(`your new daily budget is R$ ${budget}`)

        state.batchInserts = []
        return
    }

    ctx.reply('digite fim para finalizar o batch, ou continue informando o valor e descricao separado por virgula')
    state.batchInserts.push({ money: content[0], description: content[1] })
}

function enviarMensagemHTML(message, chatID) {
    telegram.sendMessage(chatID, message, { parse_mode: 'HTML' })
        .catch(error => {
            console.error('[Telegram][enviarMensagemHTML] Erro ao enviar mensagem:', error.message)
        })
}

bot.use(async (ctx, next) => {
    if (ctx.chat.type === 'private') {
        const id = ctx.update.message.from.id

        if (id !== CHAT_ID) {
            await ctx.reply('Voce nao tem permissao para acessar esse bot')
            enviarMensagemParaMim(`Usuario desconhecido tentou acessar o bot: ${ctx.update.message.from.first_name}`)
            return
        }
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
    state.awaitResponseSpentMoney = true
    ctx.reply('informe o valor e descricao separado por virgula')
})

bot.hears('batch', ctx => {
    state.awaitResponseSpentMoney = true
    state.batchResponse = true
    ctx.reply('informe o valor e descricao separado por virgula')
})

bot.hears(['Info', 'Links', 'Link'], ctx => {
    ctx.replyWithMarkdownV2(
        `*Informações*
• [Documentação](https://docs.arbitragem-crypto.cloud/introduction)
• [Site](https://market.arbitragem-crypto.cloud/)
• [Plataforma](https://arbitragem-crypto.cloud/)`
    )
})

bot.on(message('text'), async ctx => {
    if (!state.awaitResponseSpentMoney) return;

    const [money, description] = ctx.update.message.text.split(',');

    if (state.batchResponse) {
        handleBatchResponse(ctx, [money, description]);
        return;
    }

    try {
        const budget = await myDailyBudgetService.spentMoney({ money, description });
        ctx.reply(`your new daily budget is R$ ${budget}`);
    } catch (error) {
        console.error('Error processing spent money:', error);
        ctx.reply('An error occurred while processing your request. Please try again.');
    } finally {
        state.awaitResponseSpentMoney = false;
    }
});

bot.launch()

module.exports = {
    enviarMensagemParaMim,
    enviarMensagemHTML
}