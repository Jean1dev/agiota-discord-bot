import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('RateLimitGuard')

interface BucketEntry {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  /** Máximo de requisições permitidas na janela de tempo. Padrão: 5 */
  maxRequests?: number
  /** Duração da janela em milissegundos. Padrão: 60_000 (1 minuto) */
  windowMs?: number
}

/**
 * Rate limiter em memória por usuário.
 *
 * Usa o algoritmo de janela fixa: cada usuário tem um contador que reseta
 * após `windowMs` milissegundos. Simples, sem dependências externas.
 *
 * Uso direto:
 *   const limiter = new RateLimitGuard({ maxRequests: 5, windowMs: 60_000 })
 *   const { allowed, retryAfterMs } = limiter.check('userId123')
 *
 * Uso via BaseCommand (injetado):
 *   class MyCommand extends BaseCommand<...> {
 *     protected readonly rateLimitOptions = { maxRequests: 3, windowMs: 30_000 }
 *   }
 */
export class RateLimitGuard {
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly buckets = new Map<string, BucketEntry>()

  constructor(options: RateLimitOptions = {}) {
    this.maxRequests = options.maxRequests ?? 5
    this.windowMs = options.windowMs ?? 60_000
  }

  /**
   * Verifica e registra uma requisição para o usuário.
   * @returns `allowed: true` se dentro do limite; `allowed: false` + `retryAfterMs` caso contrário.
   */
  check(userId: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now()
    const entry = this.buckets.get(userId)

    if (!entry || now >= entry.resetAt) {
      this.buckets.set(userId, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, retryAfterMs: 0 }
    }

    if (entry.count >= this.maxRequests) {
      const retryAfterMs = entry.resetAt - now
      log.warn({ userId, count: entry.count, retryAfterMs }, 'Rate limit atingido')
      return { allowed: false, retryAfterMs }
    }

    entry.count++
    return { allowed: true, retryAfterMs: 0 }
  }

  /** Remove entradas expiradas — útil para evitar crescimento indefinido em processos longos. */
  cleanup(): void {
    const now = Date.now()
    for (const [userId, entry] of this.buckets.entries()) {
      if (now >= entry.resetAt) this.buckets.delete(userId)
    }
  }

  /** Total de usuários rastreados atualmente. */
  get trackedUsers(): number {
    return this.buckets.size
  }
}

/** Instância global compartilhada entre todos os BaseCommand. */
export const globalRateLimiter = new RateLimitGuard({ maxRequests: 5, windowMs: 60_000 })
