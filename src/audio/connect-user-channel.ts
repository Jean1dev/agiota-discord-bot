import { VoiceConnectionStatus, joinVoiceChannel, entersState, VoiceConnection } from '@discordjs/voice'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createDiscordJSAdapter = require('../adapters/discord-adapter')

interface VoiceChannel {
  id: string
  guild: { id: string; shard: { status: number; send(data: unknown): void } }
  client: { user?: { id: string } }
}

export async function connectUserChannel(channel: VoiceChannel): Promise<VoiceConnection> {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    debug: true,
    adapterCreator: createDiscordJSAdapter(channel),
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
