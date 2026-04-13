import { buildMessageElements } from './watson-utils'
import { textCompletion } from './open-ai-api'
import { env } from '../config/env'
import { createLogger } from '../shared/logger/Logger'

const log = createLogger('IA')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AssistantV2 = require('ibm-watson/assistant/v2')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IamAuthenticator } = require('ibm-watson/auth')

const assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({ apikey: env.ASSISTANT_IAM_APIKEY }),
  url: 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/c50aa5e1-86af-4bfc-b101-4b2c661e73b4',
})

const state: { sessionId: string | undefined } = { sessionId: undefined }

async function fallbackToChatGpt(message: any): Promise<void> {
  const args = [message.content]
  try {
    const response = await textCompletion([{ role: 'user', content: message.content }])
    const reply = response.choices[0]?.message.content.trim() ?? ''
    await message.channel.send(reply)
  } catch (err) {
    log.error({ err }, 'ChatGPT fallback error')
    await message.channel.send('Não consegui processar sua mensagem.')
    void args
  }
}

function createSession(callback: () => void = () => { }): void {
  log.warn('criando sessao no watson')
  assistant.createSession({ assistantId: env.ASSISTANT_ID })
    .then((response: any) => {
      state.sessionId = response.result.session_id
      callback()
    })
    .catch((err: unknown) => log.error({ err }, 'erro ao pegar sessao no watson'))
}

function sendMessage(message: any): void {
  if (!state.sessionId) {
    return createSession(() => sendMessage(message))
  }

  const payload = {
    assistantId: env.ASSISTANT_ID,
    sessionId: state.sessionId,
    input: { message_type: 'text', text: message.content },
  }

  void assistant.message(payload)
    .then((response: any) => {
      const data = buildMessageElements(response.result)
      if (!data.length) {
        void fallbackToChatGpt(message)
        return
      }
      for (const recognizer of data) {
        if (recognizer.type === 'suggestion') { void fallbackToChatGpt(message); return }
        if (recognizer.text === 'Eu não entendi. Você pode tentar reformular a frase.') { void fallbackToChatGpt(message); return }
        message.channel.send(recognizer.text)
      }
    })
    .catch((err: unknown) => {
      state.sessionId = undefined
      log.error({ err }, 'erro ao enviar mensagem')
    })
}

export const handleMessageWithIa = sendMessage
