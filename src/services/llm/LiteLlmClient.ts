import fs from 'fs'
import OpenAI from 'openai'
import { env } from '../../config/env'
import { getDefaultChatModel } from './defaultChatModel'
import { LITELLM_STT_MODEL, LITELLM_TTS_MODEL } from './constants'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface TextCompletionResponse {
  choices: Array<{ message: { content: string } }>
}

export interface LiteLlmModel {
  id: string
  mode?: string
}

function requireLiteLlmConfig(): { baseURL: string; apiKey: string } {
  const baseURL = env.LITELLM_BASE_URL
  const apiKey = env.LITELLM_API_KEY
  if (!baseURL || !apiKey) {
    throw new Error('LiteLLM não configurado: defina LITELLM_BASE_URL e LITELLM_API_KEY')
  }
  return { baseURL, apiKey }
}

let cachedClient: OpenAI | null = null

export function getLiteLlmClient(): OpenAI {
  if (cachedClient) return cachedClient
  const { baseURL, apiKey } = requireLiteLlmConfig()
  cachedClient = new OpenAI({ apiKey, baseURL })
  return cachedClient
}

export function resetLiteLlmClientForTests(): void {
  cachedClient = null
}

export async function listModels(): Promise<LiteLlmModel[]> {
  const client = getLiteLlmClient()
  const response = await client.models.list()
  const models: LiteLlmModel[] = []
  for await (const model of response) {
    models.push({
      id: model.id,
      mode: (model as { mode?: string }).mode,
    })
  }
  return models
}

export async function textCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; model?: string },
): Promise<TextCompletionResponse> {
  const client = getLiteLlmClient()
  const chatCompletion = await client.chat.completions.create({
    messages,
    model: options?.model ?? getDefaultChatModel(),
    temperature: options?.temperature ?? 0.8,
  })
  return chatCompletion as unknown as TextCompletionResponse
}

export async function speechToText(filename: string): Promise<string> {
  const client = getLiteLlmClient()
  const stream = fs.createReadStream(filename)
  const transcription = await client.audio.transcriptions.create({
    file: stream as any,
    model: LITELLM_STT_MODEL,
    language: 'pt',
    response_format: 'verbose_json',
  })
  return (transcription as any).text
}

export async function textToSpeech(inputText: string): Promise<Buffer> {
  const client = getLiteLlmClient()
  const mp3 = await client.audio.speech.create({
    model: LITELLM_TTS_MODEL,
    voice: 'alloy',
    input: inputText,
  })
  return Buffer.from(await mp3.arrayBuffer())
}

export function isLiteLlmConfigured(): boolean {
  return Boolean(env.LITELLM_BASE_URL && env.LITELLM_API_KEY)
}
