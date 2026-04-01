import { Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import type { Context } from 'telegraf'
import { KEYBOARDS } from '../TelegramConfig'

// myDailyBudgetService ainda em JS — será migrado na Fase 10
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { myDailyBudgetService } = require('../../services')

const state = {
  awaitResponseSpentMoney: false,
  batchResponse: false,
  batchInserts: [] as { money: string; description: string }[],
}

function handleBatchResponse(ctx: Context, content: [string, string]) {
  if (content[0]?.toLowerCase() === 'fim') {
    state.awaitResponseSpentMoney = false
    state.batchResponse = false
    const budget = myDailyBudgetService.batchInsert(state.batchInserts)
    const summary = state.batchInserts.map(i => `- R$ ${i.money}: ${i.description}`).join('\n')
    ctx.reply(`Batch summary:\n${summary}`)
    ctx.reply(`your new daily budget is R$ ${budget}`)
    state.batchInserts = []
    return
  }
  ctx.reply('digite fim para finalizar o batch, ou continue informando o valor e descricao separado por virgula')
  state.batchInserts.push({ money: content[0] ?? '', description: content[1] ?? '' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerDailyBudgetHandlers(bot: any): void {
  bot.start(async (ctx: Context) => {
    const name = (ctx.update as never as { message: { from: { first_name: string } } }).message.from.first_name
    await ctx.reply(`*Bom dia ${name}`)
    await ctx.replyWithMarkdownV2(
      'Use os botoes a baixo para uma melhor interacao',
      Markup.keyboard(KEYBOARDS.dailyBudget.keyboard).resize(),
    )
  })

  bot.hears('My Daily budget', async (ctx: Context) => {
    const budget = await myDailyBudgetService.getMyDailyBudget()
    ctx.reply(`R$ ${budget}`)
  })

  bot.hears('spent money', (ctx: Context) => {
    state.awaitResponseSpentMoney = true
    ctx.reply('informe o valor e descricao separado por virgula')
  })

  bot.hears('batch', (ctx: Context) => {
    state.awaitResponseSpentMoney = true
    state.batchResponse = true
    ctx.reply('informe o valor e descricao separado por virgula')
  })

  bot.hears(['Info', 'Links', 'Link'], (ctx: Context) => {
    ctx.replyWithMarkdownV2(
      `*Informações*\n• [Documentação](https://docs.arbitragem-crypto.cloud/introduction)\n• [Site](https://market.arbitragem-crypto.cloud/)\n• [Plataforma](https://arbitragem-crypto.cloud/)\n• [Comunidade](https://comunidade.arbitragem-crypto.cloud/)`,
    )
  })

  bot.on(message('text'), async (ctx: Context) => {
    if (!state.awaitResponseSpentMoney) return
    const text = (ctx.update as never as { message: { text: string } }).message.text
    const [money, description] = text.split(',') as [string, string]
    if (state.batchResponse) { handleBatchResponse(ctx, [money, description]); return }
    try {
      const budget = await myDailyBudgetService.spentMoney({ money, description })
      ctx.reply(`your new daily budget is R$ ${budget}`)
    } catch (err) {
      console.error('Error processing spent money:', err)
      ctx.reply('An error occurred. Please try again.')
    } finally {
      state.awaitResponseSpentMoney = false
    }
  })
}
