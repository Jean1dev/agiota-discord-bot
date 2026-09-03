import { contextInstance } from '../../context'
import { FALLBACK_CHAT_MODEL } from './constants'

export function getDefaultChatModel(): string {
  try {
    const fromContext = contextInstance().defaultChatModel?.trim()
    if (fromContext) return fromContext
  } catch {
  }
  return FALLBACK_CHAT_MODEL
}

export function setDefaultChatModel(modelId: string): void {
  const ctx = contextInstance()
  ctx.defaultChatModel = modelId
  ctx.save()
}
