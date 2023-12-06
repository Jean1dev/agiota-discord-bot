const { Client, Intents } = require('discord.js')
const config = require('./config')
const commands = require('./commands')
const { createContext, contextInstance } = require('./context')
const { handleMessageWithIa } = require('./ia')
const handleDM = require('./handlers/dm')
const registerJobs = require('./register-jobs')
const { registrarEntradaTexto, listarAsUltimasFeatures, myDailyBudgetService } = require('./services')
const ConversationHistoryGpt = require('./services/ConversationHistoryGpt')
const { connect } = require('./repository/mongodb')

const client = new Client({
  partials: ["CHANNEL"],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  ]
})

client.login(config.BOT_TOKEN)

const prefix = process.env.NODE_ENV === 'dev' ? '!' : '$'

console.log('Comando do bot ', prefix)

function avisarQueEstaOnline() {
  if (process.env.NODE_ENV === 'dev')
    return

  const channel = client.channels.cache.find(channel => channel.name === '🧵-geral')

  if (channel && channel.send) {
    listarAsUltimasFeatures(channel)
  } else {
    console.log('nao consegui enviar mensagem ::', channel)
  }
}

client.on('ready', async () => {
  await connect()
  avisarQueEstaOnline()

  const context = createContext()
  context.setClient(client)
  await context.fillState()

  registerJobs()
  await myDailyBudgetService.fillDaylyBudgetState()
})

client.on("messageCreate", async function (message) {
  if (message.author.bot)
    return

  registrarEntradaTexto(message)
  ConversationHistoryGpt(message)
  
  if (message.channel.type === 'DM') {
    return handleDM(message, client)
  }

  if (contextInstance().isIAEnabled && !message.content.startsWith(prefix)) {
    return handleMessageWithIa(message)
  }

  if (!message.content.startsWith(prefix))
    return

  const commandBody = message.content.slice(prefix.length).trim()
  const parameters = commandBody.split(' ')
  const command = parameters.shift().toLowerCase()
  return commands(command, parameters, message)
})
