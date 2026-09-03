import { ChatOpenAI } from '@langchain/openai'
import { nativeFetch } from '../../shared/http/native-fetch'
import { env } from '../../config/env'
import { getDefaultChatModel } from './defaultChatModel'

export function createChatOpenAI(options?: {
  temperature?: number
  modelName?: string
}): ChatOpenAI {
  const baseURL = env.LITELLM_BASE_URL
  const apiKey = env.LITELLM_API_KEY
  if (!baseURL || !apiKey) {
    throw new Error('LiteLLM não configurado: defina LITELLM_BASE_URL e LITELLM_API_KEY')
  }

  return new ChatOpenAI({
    modelName: options?.modelName ?? getDefaultChatModel(),
    temperature: options?.temperature ?? 0.7,
    apiKey,
    configuration: {
      baseURL,
      fetch: nativeFetch,
    },
  })
}
