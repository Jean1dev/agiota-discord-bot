import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('ChatSessionService')

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatSession {
  readonly threadId: string
  readonly messages: ReadonlyArray<ChatMessage>
}

/**
 * Gerencia o histórico de conversas com o ChatGPT por thread do Discord.
 *
 * PROBLEMA CORRIGIDO: o código original armazenava conversas no God-object
 * `context().conversationHistory` sem limite — crescia indefinidamente.
 *
 * Solução:
 * - Histórico em memória limitado a `maxMessages` por sessão
 * - Sessões expiram após `sessionTtlMs` (padrão: 30 minutos)
 * - Cleanup automático via `purgeExpired()`
 */
export class ChatSessionService {
  private readonly sessions = new Map<string, { session: ChatSession; lastActivity: number }>()
  private readonly maxMessages: number
  private readonly sessionTtlMs: number

  constructor(options: { maxMessages?: number; sessionTtlMs?: number } = {}) {
    this.maxMessages = options.maxMessages ?? 20
    this.sessionTtlMs = options.sessionTtlMs ?? 30 * 60 * 1000 // 30 min
  }

  /** Cria uma nova sessão para a thread e retorna ela. */
  createSession(threadId: string, initialMessage: string): ChatSession {
    const session: ChatSession = {
      threadId,
      messages: [{ role: 'user', content: initialMessage }],
    }
    this.sessions.set(threadId, { session, lastActivity: Date.now() })
    log.debug({ threadId }, 'Nova sessão de chat criada')
    return session
  }

  /** Busca a sessão pelo ID da thread. */
  getSession(threadId: string): ChatSession | null {
    const entry = this.sessions.get(threadId)
    if (!entry) return null
    entry.lastActivity = Date.now()
    return entry.session
  }

  /**
   * Adiciona uma mensagem à sessão e retorna o histórico atualizado.
   * Mantém no máximo `maxMessages` — remove as mais antigas ao exceder.
   */
  addMessage(threadId: string, role: 'user' | 'assistant', content: string): ChatSession | null {
    const entry = this.sessions.get(threadId)
    if (!entry) return null

    const messages = [...entry.session.messages, { role, content }]

    // Garante o limite: remove as mensagens mais antigas mas preserva a primeira (contexto inicial)
    const bounded = messages.length > this.maxMessages
      ? [messages[0]!, ...messages.slice(-(this.maxMessages - 1))]
      : messages

    const updated: ChatSession = { threadId, messages: bounded }
    entry.session = updated
    entry.lastActivity = Date.now()
    return updated
  }

  /** Remove sessões expiradas — chamar periodicamente para evitar crescimento de memória. */
  purgeExpired(): number {
    const now = Date.now()
    let purged = 0
    for (const [threadId, entry] of this.sessions.entries()) {
      if (now - entry.lastActivity > this.sessionTtlMs) {
        this.sessions.delete(threadId)
        purged++
      }
    }
    if (purged > 0) log.debug({ purged }, 'Sessões de chat expiradas removidas')
    return purged
  }

  get activeSessionCount(): number {
    return this.sessions.size
  }
}

/** Instância global singleton. */
export const chatSessionService = new ChatSessionService()
