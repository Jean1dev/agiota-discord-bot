require('dotenv').config()
const config = require('./config')
const {
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
} = require('@discordjs/voice')
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

const prefix = '$'

const player = createAudioPlayer()
context.player = player

function playSong() {
  const audios = [
    'https://www.myinstants.com/media/sounds/vem-monstro.mp3',
    'https://www.myinstants.com/media/sounds/eu-vou-comer-teu-cu-kid-bengala.mp3',
    'https://www.myinstants.com/media/sounds/nossa-lobo-mauuuuu.mp3',
    'https://www.myinstants.com/media/sounds/rojao-estourado.mp3',
    'https://protettordelinks.com/wp-content/baixar/macaco_doido_www.toquesengracadosmp3.com.mp3'
  ]
  const resource = createAudioResource(audios[1], {
    inputType: StreamType.Arbitrary,
  })

  player.play(resource)

  return entersState(player, AudioPlayerStatus.Playing, 5e3)
}

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

  try {
    await playSong()
    console.log('Song is ready to play!')
  } catch (error) {
    console.error(error)
  }
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
