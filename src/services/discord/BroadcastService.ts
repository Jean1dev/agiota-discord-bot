import { contextInstance } from '../../context'
import { ALERT_CHANNEL } from '../../discord/DiscordConstants'
import type { Client } from 'discord.js'

function getClient(): Client | undefined {
  return contextInstance()?.client
}

export function sendToChannel(channelName: string, message: string): void {
  const client = getClient()
  if (!client?.guilds) return
  client.guilds.cache.forEach(guild => {
    const ch = guild.channels.cache.find(c => (c as { name: string }).name === channelName)
    if (ch) (ch as { send(m: string): void }).send(message)
  })
}

export function broadcastDiscord(message: string): void {
  sendToChannel(ALERT_CHANNEL, message)
}
