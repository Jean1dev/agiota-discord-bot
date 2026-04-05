import { contextInstance } from '../context'
import { textCompletion } from '../ia/open-ai-api'

const MAX_LENGTH = 2000

function divideMessage(message: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = message
  while (remaining.length > maxLength) {
    chunks.push(remaining.substring(0, maxLength))
    remaining = remaining.substring(maxLength)
  }
  chunks.push(remaining)
  return chunks
}

function gptResponseDisplay(thread: any, chatGPTResponse: string): void {
  if (chatGPTResponse.length > MAX_LENGTH) {
    for (const chunk of divideMessage(chatGPTResponse, MAX_LENGTH)) {
      thread.send(chunk)
    }
  } else {
    thread.send(chatGPTResponse)
  }
}

function continueConversation(conversationHistory: any, newMessage: string): void {
  conversationHistory.messages.push({ role: 'user', content: newMessage })
  textCompletion(conversationHistory.messages)
    .then((data) => {
      const chatGPTResponse = data.choices[0]?.message.content.trim() ?? ''
      conversationHistory.messages.push({ role: 'assistant', content: chatGPTResponse })
      gptResponseDisplay(conversationHistory.thread, chatGPTResponse)
    })
    .catch((err: unknown) => console.error('ConversationHistoryGpt error', err))
}

const conversationHistoryGpt = (message: any): void => {
  const ctx = contextInstance()
  const threadRef = ctx.conversationHistory.find(
    (obj: any) => obj.threadRef === message.channelId
  )
  if (threadRef) {
    continueConversation(threadRef, message.content)
  }
}

export default conversationHistoryGpt
