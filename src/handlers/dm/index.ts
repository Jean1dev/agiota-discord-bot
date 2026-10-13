import { LIXO_CHANNEL } from '../../discord/DiscordConstants'

const dmHandler = (message: any, client: any): void => {
  const channel = (client.channels.cache as any).find(
    (ch: any) => ch.name === LIXO_CHANNEL
  )
  if (channel?.send) {
    setTimeout(() => { channel.send(message.content) }, 2000)
  }
}

export default dmHandler
