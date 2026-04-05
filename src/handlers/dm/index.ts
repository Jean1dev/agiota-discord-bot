import { CHAT_GERAL } from '../../discord/DiscordConstants'
import { runQuizTask } from '../../services/quiz/QuizService'

const dmHandler = (message: any, client: any): void => {
  if (message.content === 'quiz') {
    setTimeout(() => runQuizTask(), 2000)
    return
  }

  const channel = (client.channels.cache as any).find(
    (ch: any) => ch.name === CHAT_GERAL
  )
  if (channel?.send) {
    setTimeout(() => { channel.send(message.content) }, 2000)
  }
}

export default dmHandler
