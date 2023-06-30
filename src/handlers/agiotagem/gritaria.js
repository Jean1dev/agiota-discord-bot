const connectToChannel = require('../../adapters/connect-user-channel')
const {
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
} = require('@discordjs/voice')

const audios = [
  'https://www.myinstants.com/media/sounds/rojao-estourado.mp3',
  'https://www.myinstants.com/media/sounds/nossa-lobo-mauuuuu.mp3',
  'https://www.myinstants.com/media/sounds/vem-monstro.mp3',
  'https://www.myinstants.com/media/sounds/eu-vou-comer-teu-cu-kid-bengala.mp3',
  'https://www.myinstants.com/media/sounds/tmp09ygatwy.mp3',
  'https://www.myinstants.com/media/sounds/vamos-usar-droga-desgraca.mp3',
  'https://www.myinstants.com/media/sounds/aud-20180228-wa0076.mp3',
  'https://www.myinstants.com/media/sounds/homem-macaco.mp3',
  'https://protettordelinks.com/wp-content/baixar/macaco_doido_www.toquesengracadosmp3.com.mp3'
]

const ramdomAudioNumber = () => {
  return Math.floor(Math.random() * audios.length)
}

const state = {
  player: null,
  audioNumero: ramdomAudioNumber()
}

function playSong() {
  const resource = createAudioResource(audios[state.audioNumero], {
    inputType: StreamType.Arbitrary,
  })

  state.player = createAudioPlayer()
  state.player.play(resource)
  state.audioNumero = ramdomAudioNumber()
  return entersState(state.player, AudioPlayerStatus.Playing, 5e3)
}

module.exports = async message => {
  const channel = message.member?.voice.channel

  if (channel) {
    try {

      await playSong()
      const connection = await connectToChannel(channel)
      connection.subscribe(state.player)

      setTimeout(() => {
        connection.disconnect()
      }, 60000)

    } catch (error) {
      console.error(error)
      state.audioNumero = 0
    }
  } else {
    message.reply('Join a voice channel then try again!')
  }
}
