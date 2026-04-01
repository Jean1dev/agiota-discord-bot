import { RateLimitGuard } from '../../../../src/discord/guards/RateLimitGuard'

describe('RateLimitGuard', () => {
  describe('check', () => {
    it('permite a primeira requisição', () => {
      const guard = new RateLimitGuard({ maxRequests: 3, windowMs: 60_000 })
      const result = guard.check('user1')
      expect(result.allowed).toBe(true)
      expect(result.retryAfterMs).toBe(0)
    })

    it('permite requisições até o limite', () => {
      const guard = new RateLimitGuard({ maxRequests: 3, windowMs: 60_000 })
      expect(guard.check('user1').allowed).toBe(true)
      expect(guard.check('user1').allowed).toBe(true)
      expect(guard.check('user1').allowed).toBe(true)
    })

    it('bloqueia ao exceder o limite', () => {
      const guard = new RateLimitGuard({ maxRequests: 2, windowMs: 60_000 })
      guard.check('user1')
      guard.check('user1')
      const result = guard.check('user1')
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it('isola contadores por userId', () => {
      const guard = new RateLimitGuard({ maxRequests: 1, windowMs: 60_000 })
      expect(guard.check('user1').allowed).toBe(true)
      expect(guard.check('user2').allowed).toBe(true)  // usuário diferente não é afetado
      expect(guard.check('user1').allowed).toBe(false) // user1 atingiu o limite
    })

    it('reseta o contador após a janela expirar', async () => {
      const guard = new RateLimitGuard({ maxRequests: 1, windowMs: 50 })
      expect(guard.check('user1').allowed).toBe(true)
      expect(guard.check('user1').allowed).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 60))

      expect(guard.check('user1').allowed).toBe(true)  // janela resetou
    })

    it('retryAfterMs é aproximadamente a duração restante da janela', () => {
      const guard = new RateLimitGuard({ maxRequests: 1, windowMs: 60_000 })
      guard.check('user1')
      const { retryAfterMs } = guard.check('user1')
      expect(retryAfterMs).toBeGreaterThan(59_000)
      expect(retryAfterMs).toBeLessThanOrEqual(60_000)
    })
  })

  describe('cleanup', () => {
    it('remove entradas expiradas', async () => {
      const guard = new RateLimitGuard({ maxRequests: 5, windowMs: 30 })
      guard.check('user1')
      guard.check('user2')
      expect(guard.trackedUsers).toBe(2)

      await new Promise(resolve => setTimeout(resolve, 40))
      guard.cleanup()

      expect(guard.trackedUsers).toBe(0)
    })

    it('mantém entradas ainda válidas', () => {
      const guard = new RateLimitGuard({ maxRequests: 5, windowMs: 60_000 })
      guard.check('user1')
      guard.cleanup()
      expect(guard.trackedUsers).toBe(1)
    })
  })
})
