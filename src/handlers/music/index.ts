import { GuildMember, MessageEmbed } from 'discord.js'
import { joinVoiceChannel, entersState, VoiceConnectionStatus, AudioPlayerStatus } from '@discordjs/voice'
import { Track } from './track'
import { MusicSubscription } from './subcription'
import { contextInstance } from '../../context'
import { textToSpeech } from '../../ia/open-ai-api'
import { runMusicBuffer } from './play-resource-buffer'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { addMusic, ramdomMusic } = require('../../services')

const subscriptions = new Map<string, MusicSubscription>()
let playerLigado = false

const gifDj = 'https://i.imgur.com/z7R8T.gif'

async function playSong(
  url: string,
  subscription: MusicSubscription | undefined,
  interaction: any,
  subs: Map<string, MusicSubscription>
): Promise<void> {
  if (!subscription) {
    if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
      const channel = interaction.member.voice.channel
      subscription = new MusicSubscription(
        joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        })
      )
      subscription.voiceConnection.on('error', console.warn)
      subs.set(interaction.guildId, subscription)
    }
  }

  if (!subscription) {
    await interaction.followUp('Join a voice channel and then try that again!')
    return
  }

  try {
    await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
  } catch (error) {
    console.warn(error)
    await interaction.followUp('Failed to join voice channel within 20 seconds, reiniciando processo')
    process.exit(0)
  }

  try {
    const track = await Track.from(url, {
      onStart() { interaction.followUp({ content: 'Now playing!', ephemeral: true }).catch(console.warn) },
      onFinish() { interaction.followUp({ content: 'Now finished!', ephemeral: true }).catch(console.warn) },
      onError(error: Error) {
        console.warn(error)
        interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn)
      },
    })
    subscription.enqueue(track)
    await interaction.followUp(`Enqueued **${track.title}**`)
  } catch (error: any) {
    console.warn(error)
    let errorMessage = 'Failed to play track, please try again later!'
    if (error.message?.includes('Sign in to confirm')) errorMessage = 'YouTube is temporarily blocking requests. Please try again in a few minutes.'
    else if (error.message?.includes('Video unavailable')) errorMessage = 'This video is unavailable or private.'
    else if (error.message?.includes('Video is private')) errorMessage = 'This video is private and cannot be played.'
    else if (error.message?.includes('Video is age restricted')) errorMessage = 'This video is age restricted and cannot be played.'
    await interaction.followUp(errorMessage)
  }
}

const musicHandler = async (message: any): Promise<void> => {
  if (!message.guild) return

  if (playerLigado) {
    message.reply('O player ja esta ligado, utilize o /play musica para tocar um som')
    return
  }

  playerLigado = true

  await message.guild.commands.set([
    { name: 'play', description: 'Plays a song', options: [{ name: 'song', type: 'STRING', description: 'The URL of the song to play', required: true }] },
    { name: 'skip', description: 'Skip to the next song in the queue' },
    { name: 'queue', description: 'See the music queue' },
    { name: 'pause', description: 'Pauses the song that is currently playing' },
    { name: 'resume', description: 'Resume playback of the current song' },
    { name: 'leave', description: 'Leave the voice channel' },
    { name: 'random', description: 'Play random music' },
    { name: 'talk-to-me', description: 'Conversa com o mamaco', options: [{ name: 'input', type: 'STRING', description: 'Sobre oq vamos conversar?', required: true }] },
  ])

  const embed = new MessageEmbed()
    .setTitle('Player de música ligado!')
    .setDescription('Use / para visualizar todas as opções')
    .setImage(gifDj)

  message.channel.send({ embeds: [embed] })

  const context = contextInstance()
  context.client.on('interactionCreate', async (interaction: any) => {
    if (!interaction.isCommand() || !interaction.guildId) return
    const subscription = subscriptions.get(interaction.guildId)

    if (interaction.commandName === 'play') {
      await interaction.deferReply()
      const url: string = interaction.options.get('song').value
      addMusic(url)
      await playSong(url, subscription, interaction, subscriptions)
    } else if (interaction.commandName === 'skip') {
      if (subscription) { subscription.audioPlayer.stop(); await interaction.reply('Skipped song!') }
      else await interaction.reply('Not playing in this server!')
    } else if (interaction.commandName === 'queue') {
      if (subscription) {
        const current = subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
          ? 'Nothing is currently playing!'
          : `Playing **${(subscription.audioPlayer.state as any).resource?.metadata.title}**`
        const queue = subscription.queue.slice(0, 5).map((t, i) => `${i + 1}) ${t.title}`).join('\n')
        await interaction.reply(`${current}\n\n${queue}`)
      } else await interaction.reply('Not playing in this server!')
    } else if (interaction.commandName === 'pause') {
      if (subscription) { subscription.audioPlayer.pause(); await interaction.reply({ content: 'Paused!', ephemeral: true }) }
      else await interaction.reply('Not playing in this server!')
    } else if (interaction.commandName === 'resume') {
      if (subscription) { subscription.audioPlayer.unpause(); await interaction.reply({ content: 'Unpaused!', ephemeral: true }) }
      else await interaction.reply('Not playing in this server!')
    } else if (interaction.commandName === 'leave') {
      if (subscription) { subscription.voiceConnection.destroy(); subscriptions.delete(interaction.guildId); await interaction.reply({ content: 'Left channel!', ephemeral: true }) }
      else await interaction.reply('Not playing in this server!')
    } else if (interaction.commandName === 'random') {
      await interaction.deferReply()
      const musicEscolhida: string = await ramdomMusic()
      if (musicEscolhida === '') { await interaction.followUp('Nenhuma musica salva!'); return }
      await playSong(musicEscolhida, subscription, interaction, subscriptions)
    } else if (interaction.commandName === 'talk-to-me') {
      await interaction.deferReply()
      const inputText: string = interaction.options.get('input').value
      const audioBuffer = await textToSpeech(inputText)
      const channel = interaction.member.voice.channel
      await runMusicBuffer(channel, audioBuffer)
      await interaction.followUp('eita po')
    } else {
      await interaction.reply('Unknown command')
    }
  })
}

export default musicHandler
