import { Client, Intents, Message } from 'discord.js'
import { createContext, contextInstance } from './context'
import { CHAT_GERAL } from './discord/DiscordConstants'
import captureException from './observability/Sentry'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('./config')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const commands = require('./commands')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleMessageWithIa } = require('./ia')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const handleDM = require('./handlers/dm')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registerJobs = require('./register-jobs')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registrarEntradaTexto, listarAsUltimasFeatures, myDailyBudgetService } = require('./services')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ConversationHistoryGpt = require('./services/ConversationHistoryGpt')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { connect } = require('./repository/mongodb')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleOAuthState = require('./adapters/google-Oauth')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { init: initWhatsApp } = require('./services/WhatsAppService')

const client = new Client({
    partials: ['CHANNEL'],
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    ],
})

client.login(config.BOT_TOKEN)

const prefix: string = process.env.NODE_ENV === 'dev' ? '!' : '$'

console.log('Comando do bot ', prefix)

function avisarQueEstaOnline(): void {
    if (process.env.NODE_ENV === 'dev') return

    const channel: any = client.channels.cache.find((ch: any) => ch.name === CHAT_GERAL)

    if (channel && channel.send) {
        listarAsUltimasFeatures(channel)
    } else {
        console.log('nao consegui enviar mensagem ::', channel)
    }
}

client.on('ready', async () => {
    try {
        await connect()
        await googleOAuthState.loadTokenFromDb()
        initWhatsApp().catch((e: Error) => console.error('WhatsApp init', e))
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

    registrarEntradaTexto(message)
    ConversationHistoryGpt(message)

    if (message.channel.type === 'DM') {
        return handleDM(message, client)
    }

    if (contextInstance().isIAEnabled && !message.content.startsWith(prefix)) {
        return handleMessageWithIa(message)
    }

    if (!message.content.startsWith(prefix)) return

    const commandBody = message.content.slice(prefix.length).trim()
    const parameters = commandBody.split(' ')
    const command = parameters.shift()!.toLowerCase()
    return commands(command, parameters, message)
})
