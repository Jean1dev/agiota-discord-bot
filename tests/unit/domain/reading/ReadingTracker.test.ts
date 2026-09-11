import { ReadingTracker } from '../../../../src/domain/reading/ReadingTracker'

describe('ReadingTracker', () => {
  it('começa com saldo zero', () => {
    const tracker = new ReadingTracker()
    expect(tracker.pages).toBe(0)
    expect(tracker.pagesDebt).toBe(0)
    expect(tracker.hasDebt).toBe(false)
  })

  describe('subtract', () => {
    it('retorna nova instância sem mutar a original', () => {
      const original = new ReadingTracker()
      const updated = original.subtract(5)

      expect(original.pages).toBe(0)
      expect(updated.pages).toBe(-5)
      expect(updated.pagesDebt).toBe(5)
    })

    it('acumula cobranças diárias', () => {
      const tracker = new ReadingTracker().subtract(5).subtract(5)

      expect(tracker.pages).toBe(-10)
      expect(tracker.pagesDebt).toBe(10)
    })

    it('lança erro para valor zero', () => {
      expect(() => new ReadingTracker().subtract(0))
        .toThrow('Quantidade de páginas da meta deve ser maior que zero')
    })

    it('lança erro para valor negativo', () => {
      expect(() => new ReadingTracker().subtract(-5))
        .toThrow('Quantidade de páginas da meta deve ser maior que zero')
    })
  })

  describe('add', () => {
    it('soma páginas lidas ao saldo', () => {
      const tracker = new ReadingTracker().subtract(15).add(10)
      expect(tracker.pages).toBe(-5)
      expect(tracker.pagesDebt).toBe(5)
    })

    it('zera o débito quando a leitura cobre o saldo', () => {
      const tracker = new ReadingTracker().subtract(10).add(10)
      expect(tracker.pages).toBe(0)
      expect(tracker.hasDebt).toBe(false)
    })

    it('gera crédito quando lê mais do que o débito', () => {
      const tracker = new ReadingTracker().subtract(10).add(15)
      expect(tracker.pages).toBe(5)
      expect(tracker.pagesDebt).toBe(-5)
      expect(tracker.hasDebt).toBe(false)
    })

    it('lança erro para valor zero', () => {
      expect(() => new ReadingTracker().add(0))
        .toThrow('Quantidade de páginas lidas deve ser maior que zero')
    })

    it('lança erro para valor negativo', () => {
      expect(() => new ReadingTracker().add(-5))
        .toThrow('Quantidade de páginas lidas deve ser maior que zero')
    })

    it('retorna nova instância sem mutar a original', () => {
      const charged = new ReadingTracker().subtract(15)
      const afterReading = charged.add(10)

      expect(charged.pages).toBe(-15)
      expect(afterReading.pages).toBe(-5)
    })
  })
})
