require('dotenv').config()
const config = require('./config')
const { Client, Intents } = require('discord.js')
const commands = require('./commands')
const context = require('./context')
const { handleMessageWithIa } = require('./ia')
const handleDM = require('./handlers/dm')

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
console.log(process.env.NODE_ENV)

const prefix = process.env.NODE_ENV === 'dev' ? '!' : '$'

function avisarQueEstaOnline() {
  if (process.env.NODE_ENV === 'dev')
    return

  const channel = client.channels.cache.find(channel => channel.name === '🧵-geral')
  if (channel && channel.send) {
    channel.send('to online povo')
  } else {
    console.log('nao consegui enviar mensagem ::', channel)
  }
}

client.on('ready', async () => {
  console.log('Discord.js client is ready!')
  avisarQueEstaOnline()
  context.setClient(client)
})

client.on("messageCreate", async function (message) {
  if (message.author.bot)
    return

  if (message.channel.type === 'DM') {
    return handleDM(message, client)
  }

  if (context.isIAEnabled && !message.content.startsWith(prefix)) {
    return handleMessageWithIa(message)
  }

  if (!message.content.startsWith(prefix))
    return

  const commandBody = message.content.slice(prefix.length)
  const args = commandBody.split(' ')
  const command = args.shift().toLowerCase()
  return commands(command, args, message)
})
