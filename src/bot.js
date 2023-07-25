require('dotenv').config()

const { Client, Intents } = require('discord.js')

const config = require('./config')

const commands = require('./commands')
const context = require('./context')
const { handleMessageWithIa } = require('./ia')
const handleDM = require('./handlers/dm')
const registerJobs = require('./register-jobs')
const { registrarEntradaTexto, listarAsUltimasFeatures } = require('./services')

const client = new Client({
  partials: ["CHANNEL"],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING
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
  avisarQueEstaOnline()
  context.setClient(client)
  registerJobs()
})

client.on("messageCreate", async function (message) {
  if (message.author.bot)
    return

  registrarEntradaTexto(message)
  if (message.channel.type === 'DM') {
    return handleDM(message, client)
  }

  if (context.isIAEnabled && !message.content.startsWith(prefix)) {
    return handleMessageWithIa(message)
  }

  if (!message.content.startsWith(prefix))
    return

  const commandBody = message.content.slice(prefix.length).trim()
  const parameters = commandBody.split(' ')
  const command = parameters.shift().toLowerCase()
  return commands(command, parameters, message)
})
