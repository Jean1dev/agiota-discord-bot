import { Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import type { Context } from 'telegraf'
import {
  batchInsert,
  getMyDailyBudget,
  spentMoney,
} from '../../services/finance/DailyBudgetService'
import { resolveMoneyToBrl } from '../../services/finance/CurrencyService'
import { extractTransactionsFromImage, type ExtractedTransaction } from '../../services/finance/BankNotificationImageService'
import { analyzeMerchantReceipt } from '../../services/finance/MerchantReceiptService'
import { KEYBOARDS } from '../TelegramConfig'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('DailyBudgetHandler')

const state = {
  awaitResponseSpentMoney: false,
  batchResponse: false,
  awaitCouponImage: false,
  batchInserts: [] as { money: string; description: string }[],
}


async function handleBatchResponse(ctx: Context, content: [string, string]) {
  if (content[0]?.toLowerCase() === 'fim') {
    state.awaitResponseSpentMoney = false
    state.batchResponse = false
    const budget = batchInsert(state.batchInserts)
    const summary = state.batchInserts.map(i => `- R$ ${i.money}: ${i.description}`).join('\n')
    ctx.reply(`Batch summary:\n${summary}`)
    ctx.reply(`your new daily budget is R$ ${budget}`)
    state.batchInserts = []
    return
  }
  try {
    const { brlValue, conversionInfo } = await resolveMoneyToBrl(content[0] ?? '')
    const moneyStr = String(brlValue)
    state.batchInserts.push({ money: moneyStr, description: content[1] ?? '' })
    if (conversionInfo) {
      ctx.reply(`Conversão: ${conversionInfo}`)
    }
  } catch (err) {
    log.error({ err }, 'Error resolving USD in batch')
    ctx.reply('Erro ao buscar cotação do dólar. Tente novamente.')
    return
  }
  ctx.reply('digite fim para finalizar o batch, ou continue informando o valor e descricao separado por virgula')
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
    const budget = getMyDailyBudget()
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

  bot.hears('adcionar cupom mercado', (ctx: Context) => {
    state.awaitCouponImage = true
    ctx.reply('Envie a imagem do cupom do mercado.')
  })

  bot.hears(['Info', 'Links', 'Link'], (ctx: Context) => {
    ctx.replyWithMarkdownV2(
      `*Informações*\n• [Documentação](https://docs.arbitragem-crypto.cloud/introduction)\n• [Site](https://market.arbitragem-crypto.cloud/)\n• [Plataforma](https://arbitragem-crypto.cloud/)\n• [Comunidade](https://comunidade.arbitragem-crypto.cloud/)`,
    )
  })

  bot.on(message('text'), async (ctx: Context) => {
    if (!state.awaitResponseSpentMoney) return
    const text = (ctx.update as never as { message: { text: string } }).message.text
    const [rawMoney, description] = text.split(',') as [string, string]
    if (state.batchResponse) { await handleBatchResponse(ctx, [rawMoney, description]); return }
    try {
      const { brlValue, conversionInfo } = await resolveMoneyToBrl(rawMoney ?? '')
      if (conversionInfo) {
        await ctx.reply(`Conversão: ${conversionInfo}`)
      }
      const budget = await spentMoney({ money: brlValue, description })
      ctx.reply(`your new daily budget is R$ ${budget}`)
    } catch (err) {
      log.error({ err }, 'Error processing spent money')
      ctx.reply('An error occurred. Please try again.')
    } finally {
      state.awaitResponseSpentMoney = false
    }
  })

  bot.on(message('photo'), async (ctx: Context) => {
    const photos = (ctx.update as never as { message: { photo: Array<{ file_id: string }> } }).message.photo
    const largestPhoto = photos[photos.length - 1]
    if (!largestPhoto) {
      await ctx.reply('Não foi possível obter a imagem.')
      return
    }

    if (state.awaitCouponImage) {
      state.awaitCouponImage = false
      await ctx.reply('Analisando cupom do mercado...')
      try {
        const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id)
        const result = await analyzeMerchantReceipt(fileLink.href)
        if (!result.success) {
          await ctx.reply(`Não consegui analisar o cupom.${result.reason ? ` ${result.reason}` : ''}`)
          return
        }
        await ctx.reply('Cupom do mercado registrado com sucesso!')
      } catch (err) {
        log.error({ err }, 'Error processing merchant receipt image')
        await ctx.reply('Ocorreu um erro ao processar o cupom. Tente novamente.')
      }
      return
    }

    await ctx.reply('Analisando notificação bancária...')

    try {
      const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id)
      const result = await extractTransactionsFromImage(fileLink.href)

      if (!result.success || result.transactions.length === 0) {
        await ctx.reply(`Não consegui identificar transações bancárias na imagem.${result.reason ? ` ${result.reason}` : ''}`)
        return
      }

      const conversionLines: string[] = []
      const resolved = await Promise.all(
        result.transactions.map(async (t: ExtractedTransaction) => {
          const rawMoney = t.currency === 'USD' ? `${t.money} usd` : String(t.money)
          const { brlValue, conversionInfo } = await resolveMoneyToBrl(rawMoney)
          if (conversionInfo) conversionLines.push(conversionInfo)
          return { money: brlValue, description: t.description }
        })
      )

      if (conversionLines.length > 0) {
        await ctx.reply(`Conversões:\n${conversionLines.join('\n')}`)
      }

      const newBudget = batchInsert(resolved)
      const summary = resolved.map((t: { money: number; description: string }) => `- R$ ${t.money.toFixed(2)}: ${t.description}`).join('\n')
      await ctx.reply(`Transações registradas:\n${summary}`)
      await ctx.reply(`Seu novo saldo diário é R$ ${newBudget.toFixed(2)}`)
    } catch (err) {
      log.error({ err }, 'Error processing bank notification image')
      await ctx.reply('Ocorreu um erro ao processar a imagem. Tente novamente.')
    }
  })
}
