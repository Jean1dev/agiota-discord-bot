import { CHAT_GERAL } from '../../discord/DiscordConstants'

const dmHandler = (message: any, client: any): void => {
  const channel = (client.channels.cache as any).find(
    (ch: any) => ch.name === CHAT_GERAL
  )
  if (channel?.send) {
    setTimeout(() => { channel.send(message.content) }, 2000)
  }
}

export default dmHandler
