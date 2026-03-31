import { Result } from '../../../../src/domain/shared/Result'

describe('Result', () => {
  describe('Result.ok', () => {
    it('marca ok como true e expõe o valor', () => {
      const result = Result.ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('funciona com objetos', () => {
      const payload = { id: '1', name: 'Jean' }
      const result = Result.ok(payload)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual(payload)
      }
    })
  })

  describe('Result.err', () => {
    it('marca ok como false e expõe o erro', () => {
      const error = new Error('algo deu errado')
      const result = Result.err(error)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toBe('algo deu errado')
      }
    })

    it('preserva o tipo do erro customizado', () => {
      class DomainError extends Error {
        constructor(public readonly code: string, message: string) {
          super(message)
          this.name = 'DomainError'
        }
      }

      const error = new DomainError('INVALID_VALUE', 'Valor inválido')
      const result = Result.err(error)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(DomainError)
        expect((result.error as DomainError).code).toBe('INVALID_VALUE')
      }
    })
  })

  describe('Result.fromAsync', () => {
    it('retorna ok quando a promise resolve', async () => {
      const result = await Result.fromAsync(() => Promise.resolve('sucesso'))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('sucesso')
      }
    })

    it('retorna err quando a promise rejeita com Error', async () => {
      const result = await Result.fromAsync(() => Promise.reject(new Error('falhou')))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toBe('falhou')
      }
    })

    it('converte string rejeitada em Error', async () => {
      const result = await Result.fromAsync(() => Promise.reject('string error'))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('string error')
      }
    })
  })
})
