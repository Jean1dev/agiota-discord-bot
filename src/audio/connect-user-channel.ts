import { VoiceConnectionStatus, joinVoiceChannel, entersState, VoiceConnection } from '@discordjs/voice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function connectUserChannel(channel: any): Promise<VoiceConnection> {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    debug: true,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3)
    return connection
  } catch (error) {
    connection.destroy()
    throw error
  }
}

export default connectUserChannel
