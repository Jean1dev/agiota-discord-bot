import { Client, GatewayIntentBits, Partials, ChannelType, Message } from 'discord.js'
import { createContext, contextInstance } from './context'
import { CHAT_GERAL } from './discord/DiscordConstants'
import captureException from './observability/Sentry'
import { env } from './config/env'
import commandDispatcher from './commands/index'
import { handleMessageWithIa } from './ia/index'
import dmHandler from './handlers/dm/index'
import { registerJobs } from './scheduler/index'
import { registrarEntradaTexto, listarAsUltimasFeatures, myDailyBudgetService } from './services'
import conversationHistoryGpt from './services/ConversationHistoryGpt'
import { googleOAuthState } from './adapters/google-Oauth'
import { init as initWhatsApp } from './services/WhatsAppService'
import { MongoConnection } from './infrastructure/database/MongoConnection'
import { createLogger } from './shared/logger/Logger'

const log = createLogger('bot')

const client = new Client({
  partials: [Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
  ],
})

async function startBot(retries = 5, delay = 2000): Promise<void> {
  try {
    await client.login(env.BOT_TOKEN)
  } catch (err) {
    log.error({ err, retriesLeft: retries }, 'Falha ao logar no Discord')
    if (retries > 0) {
      setTimeout(() => {
        startBot(retries - 1, delay * 2)
      }, delay)
    } else {
      captureException(err)
    }
  }
}

startBot()

const prefix: string = process.env.NODE_ENV === 'dev' ? '!' : '$'
log.info({ prefix }, 'Comando do bot')

function avisarQueEstaOnline(): void {
  if (process.env.NODE_ENV === 'dev') return
  const channel: any = (client.channels.cache as any).find((ch: any) => ch.name === CHAT_GERAL)
  if (channel?.send) {
    listarAsUltimasFeatures(channel)
  } else {
    log.warn({ channel }, 'nao consegui enviar mensagem')
  }
}

client.on('ready', async () => {
  try {
    await MongoConnection.connect(env.MONGO_URL)
    await googleOAuthState.loadTokenFromDb()
    initWhatsApp().catch((e: Error) => log.error({ err: e }, 'WhatsApp init error'))
    avisarQueEstaOnline()

    const context = createContext()
    context.setClient(client)
    await context.fillState()
    await myDailyBudgetService.fillDaylyBudgetState()

    registerJobs()
  } catch (err) {
    captureException(err)
  }
})

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return

  registrarEntradaTexto(message as any)
  conversationHistoryGpt(message as any)

  if (message.channel.type === ChannelType.DM) {
    return dmHandler(message, client)
  }

  if (contextInstance().isIAEnabled && !message.content.startsWith(prefix)) {
    return handleMessageWithIa(message)
  }

  if (!message.content.startsWith(prefix)) return

  const commandBody = message.content.slice(prefix.length).trim()
  const parameters = commandBody.split(' ')
  const command = parameters.shift()!.toLowerCase()
  return commandDispatcher(command, parameters, message)
})
