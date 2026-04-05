import { Telegraf, session } from 'telegraf'
import { TELEGRAM_API_KEY } from './TelegramConfig'
import { registerDailyBudgetHandlers } from './handlers/DailyBudgetHandler'
import { registerPublicHandlers } from './handlers/PublicHandler'
import { isAuthorizedUser, enviarMensagemParaMim, enviarMensagemHTML } from './TelegramUtils'

export { enviarMensagemParaMim, enviarMensagemHTML }

if (TELEGRAM_API_KEY) {
  const authorizedBot = new Telegraf(TELEGRAM_API_KEY)
  const publicBot = new Telegraf(TELEGRAM_API_KEY)

  authorizedBot.use(session())
  publicBot.use(session())

  authorizedBot.use(async (ctx, next) => {
    if (ctx.chat?.type === 'private') {
      const id = (ctx.update as never as { message: { from: { id: number } } }).message?.from?.id
      if (!isAuthorizedUser(id)) return
    }
    return next()
  })

  publicBot.use(async (ctx, next) => {
    if (ctx.chat?.type === 'private') {
      const id = (ctx.update as never as { message: { from: { id: number } } }).message?.from?.id
      if (isAuthorizedUser(id)) return
    }
    return next()
  })

  registerDailyBudgetHandlers(authorizedBot)
  registerPublicHandlers(publicBot)

  const bot = new Telegraf(TELEGRAM_API_KEY)
  bot.use(session())
  bot.use(async (ctx, next) => {
    const isPrivate = ctx.chat?.type === 'private'
    const chatId = (ctx.update as never as { message?: { from?: { id: number } } }).message?.from?.id
    if (isPrivate && chatId) {
      if (isAuthorizedUser(chatId)) return authorizedBot.handleUpdate(ctx.update)
      else return publicBot.handleUpdate(ctx.update)
    }
    return next()
  })

  bot.launch()
}
