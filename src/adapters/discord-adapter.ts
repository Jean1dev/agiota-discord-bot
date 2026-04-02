import { Constants } from 'discord.js'

type AdapterMethods = {
  onVoiceServerUpdate(payload: unknown): void
  onVoiceStateUpdate(payload: unknown): void
  destroy(): void
}

const adapters = new Map<string, AdapterMethods>()
const trackedClients = new Set<unknown>()
const trackedShards = new Map<number, Set<string>>()

function trackClient(client: any): void {
  if (trackedClients.has(client)) return
  trackedClients.add(client)
  client.ws.on(Constants.WSEvents.VOICE_SERVER_UPDATE, (payload: any) => {
    adapters.get(payload.guild_id)?.onVoiceServerUpdate(payload)
  })
  client.ws.on(Constants.WSEvents.VOICE_STATE_UPDATE, (payload: any) => {
    if (payload.guild_id && payload.session_id && payload.user_id === client.user?.id) {
      adapters.get(payload.guild_id)?.onVoiceStateUpdate(payload)
    }
  })
  client.on(Constants.Events.SHARD_DISCONNECT, (_: unknown, shardID: number) => {
    const guilds = trackedShards.get(shardID)
    if (guilds) {
      for (const guildID of guilds.values()) {
        adapters.get(guildID)?.destroy()
      }
    }
    trackedShards.delete(shardID)
  })
}

function trackGuild(guild: { shardID: number; id: string }): void {
  let guilds = trackedShards.get(guild.shardID)
  if (!guilds) {
    guilds = new Set()
    trackedShards.set(guild.shardID, guilds)
  }
  guilds.add(guild.id)
}

export function createDiscordJSAdapter(channel: any) {
  return (methods: AdapterMethods) => {
    adapters.set(channel.guild.id, methods)
    trackClient(channel.client)
    trackGuild(channel.guild)
    return {
      sendPayload(data: unknown): boolean {
        if (channel.guild.shard.status === Constants.Status.READY) {
          channel.guild.shard.send(data)
          return true
        }
        return false
      },
      destroy(): boolean {
        return adapters.delete(channel.guild.id)
      },
    }
  }
}

export default createDiscordJSAdapter
