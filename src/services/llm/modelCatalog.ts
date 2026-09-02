import { DISCORD_MESSAGE_MAX_LENGTH } from './constants'
import type { LiteLlmModel } from './LiteLlmClient'

const NON_CHAT_MODES = new Set([
  'image_generation',
  'video_generation',
  'realtime',
  'audio_speech',
  'audio_transcription',
  'moderation',
  'responses',
  'embedding',
])

export function filterChatModels(models: LiteLlmModel[]): LiteLlmModel[] {
  const seen = new Set<string>()
  const result: LiteLlmModel[] = []

  for (const model of models) {
    const id = model.id?.trim()
    if (!id || id.includes('*')) continue
    if (model.mode) {
      if (model.mode !== 'chat' || NON_CHAT_MODES.has(model.mode)) continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ id, mode: model.mode })
  }

  return result.sort((a, b) => a.id.localeCompare(b.id))
}

export function formatNumberedModelList(models: LiteLlmModel[]): string[] {
  const lines = models.map((m, i) => `${i + 1}. ${m.id}`)
  return chunkLines(lines, DISCORD_MESSAGE_MAX_LENGTH)
}

export function chunkLines(lines: string[], maxLength: number): string[] {
  if (!lines.length) return []

  const chunks: string[] = []
  let current = ''

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line
    if (next.length <= maxLength) {
      current = next
      continue
    }
    if (current) chunks.push(current)
    if (line.length <= maxLength) {
      current = line
    } else {
      chunks.push(line.slice(0, maxLength))
      current = ''
    }
  }

  if (current) chunks.push(current)
  return chunks
}

export function parseModelSelection(raw: string, modelCount: number): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > modelCount) return null
  return n
}
