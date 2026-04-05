import fs from 'fs'
import OpenAI from 'openai'
import { env } from '../config/env'

const client = new OpenAI({ apiKey: env.KEY_OPEN_AI })

export async function speechToText(filename: string): Promise<string> {
  const stream = fs.createReadStream(filename)
  const transcription = await client.audio.transcriptions.create({
    file: stream as any,
    model: 'whisper-1',
    language: 'pt',
    response_format: 'verbose_json',
  })
  return (transcription as any).text
}

export async function textToSpeech(inputText: string): Promise<Buffer> {
  const mp3 = await client.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: inputText,
  })
  return Buffer.from(await mp3.arrayBuffer())
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface TextCompletionResponse {
  choices: Array<{ message: { content: string } }>
}

export async function textCompletion(messages: ChatMessage[]): Promise<TextCompletionResponse> {
  const chatCompletion = await client.chat.completions.create({
    messages,
    model: 'gpt-3.5-turbo',
    temperature: 0.8,
  })
  return chatCompletion as unknown as TextCompletionResponse
}
