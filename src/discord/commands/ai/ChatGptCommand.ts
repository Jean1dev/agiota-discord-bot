import { z } from 'zod'
import { BaseCommand, DiscordMessage } from '../BaseCommand'
import { chatSessionService } from '../../../services/ai/ChatSessionService'
import { createLogger } from '../../../shared/logger/Logger'
import { contextInstance } from '../../../context'

const log = createLogger('ChatGptCommand')

const MAX_DISCORD_LENGTH = 2000

const schema = z.tuple([z.string().min(1, 'Informe sua pergunta')]).rest(z.string())

interface TextCompletionResponse {
  choices: Array<{ message: { content: string } }>
}

// Interface mínima para Thread do Discord
interface DiscordThread {
  id: string
  name: string
  send(text: string): Promise<unknown>
}

interface DiscordMessageWithThread extends DiscordMessage {
  startThread(options: {
    name: string
    autoArchiveDuration: number
    reason: string
  }): Promise<DiscordThread>
}

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > size) {
    chunks.push(remaining.substring(0, size))
    remaining = remaining.substring(size)
  }
  chunks.push(remaining)
  return chunks
}

let threadCounter = 1

/**
 * $gpt <mensagem>
 * Inicia ou continua uma conversa com o ChatGPT em uma thread do Discord.
 * O histórico é limitado a 20 mensagens por sessão e expira após 30 minutos.
 */
export class ChatGptCommand extends BaseCommand<typeof schema> {
  readonly name = 'gpt'
  readonly description = 'Tire suas dúvidas com o ChatGPT :: $gpt <pergunta>'
  protected readonly schema = schema

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private readonly openAiApi = require('../../../ia/open-ai-api')
  private readonly context = contextInstance

  protected async handle(message: DiscordMessage, [first, ...rest]: z.infer<typeof schema>): Promise<void> {
    if (!this.context().isChatGPTEnabled) {
      await message.reply('ChatGPT desativado. Use `$ia` para ativar.')
      return
    }

    const userMessage = [first, ...rest].join(' ')
    const threadMessage = message as DiscordMessageWithThread

    let thread: DiscordThread
    try {
      thread = await threadMessage.startThread({
        name: `chat-gpt-${threadCounter++}`,
        autoArchiveDuration: 60,
        reason: 'ChatGPT call',
      })
    } catch (err) {
      log.error({ err }, 'Falha ao criar thread do Discord')
      await message.reply('Não foi possível criar a thread de conversa.')
      return
    }

    const session = chatSessionService.createSession(thread.id, userMessage)

    try {
      const response = await this.openAiApi.textCompletion([...session.messages]) as TextCompletionResponse
      const reply = response.choices[0]?.message.content.trim() ?? ''

      chatSessionService.addMessage(thread.id, 'assistant', reply)
      await this.sendInChunks(thread, reply)
    } catch (err) {
      log.error({ err, threadId: thread.id }, 'Erro na chamada OpenAI')
      await thread.send('Erro ao buscar resposta. Tente novamente.')
    }
  }

  private async sendInChunks(thread: DiscordThread, text: string): Promise<void> {
    const chunks = splitIntoChunks(text, MAX_DISCORD_LENGTH)
    for (const chunk of chunks) {
      await thread.send(chunk)
    }
  }

  protected getUsage() { return '`$gpt <pergunta>`' }
}
