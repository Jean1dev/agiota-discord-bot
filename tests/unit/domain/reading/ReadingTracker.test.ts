import { ReadingTracker } from '../../../../src/domain/reading/ReadingTracker'

describe('ReadingTracker', () => {
  const makeTracker = () => new ReadingTracker([], [])

  describe('construção', () => {
    it('cria tracker sem metas nem leituras', () => {
      const tracker = makeTracker()
      expect(tracker.pagesDebt).toBe(0)
      expect(tracker.hasDebt).toBe(false)
    })
  })

  describe('addDailyGoal', () => {
    it('retorna nova instância sem mutar a original', () => {
      const original = makeTracker()
      const updated = original.addDailyGoal(5)

      expect(original.pagesDebt).toBe(0)
      expect(updated.pagesDebt).toBe(5)
    })

    it('acumula múltiplas metas corretamente', () => {
      const tracker = makeTracker().addDailyGoal(5).addDailyGoal(5)

      expect(tracker.pagesDebt).toBe(10)
      expect(tracker.goals).toHaveLength(2)
    })

    it('lança erro para valor zero', () => {
      expect(() => makeTracker().addDailyGoal(0))
        .toThrow('Quantidade de páginas da meta deve ser maior que zero')
    })

    it('lança erro para valor negativo', () => {
      expect(() => makeTracker().addDailyGoal(-5))
        .toThrow('Quantidade de páginas da meta deve ser maior que zero')
    })
  })

  describe('registerPagesRead', () => {
    it('reduz o débito', () => {
      const tracker = makeTracker().addDailyGoal(15).registerPagesRead(10)
      expect(tracker.pagesDebt).toBe(5)
    })

    it('zera o débito quando leitura é igual à meta', () => {
      const tracker = makeTracker().addDailyGoal(10).registerPagesRead(10)
      expect(tracker.pagesDebt).toBe(0)
      expect(tracker.hasDebt).toBe(false)
    })

    it('permite crédito quando lê mais que o débito', () => {
      const tracker = makeTracker().addDailyGoal(10).registerPagesRead(15)
      expect(tracker.pagesDebt).toBe(-5)
      expect(tracker.hasDebt).toBe(false)
    })

    it('lança erro para valor zero', () => {
      const tracker = makeTracker().addDailyGoal(10)
      expect(() => tracker.registerPagesRead(0))
        .toThrow('Quantidade de páginas lidas deve ser maior que zero')
    })

    it('lança erro para valor negativo', () => {
      const tracker = makeTracker().addDailyGoal(10)
      expect(() => tracker.registerPagesRead(-5))
        .toThrow('Quantidade de páginas lidas deve ser maior que zero')
    })

    it('retorna nova instância sem mutar a original', () => {
      const withGoal = makeTracker().addDailyGoal(15)
      const afterReading = withGoal.registerPagesRead(10)

      expect(withGoal.pagesDebt).toBe(15)
      expect(afterReading.pagesDebt).toBe(5)
    })
  })

  describe('totais', () => {
    it('calcula totalGoal e totalRead corretamente', () => {
      const tracker = makeTracker().addDailyGoal(5).addDailyGoal(5).registerPagesRead(3)

      expect(tracker.totalGoal).toBe(10)
      expect(tracker.totalRead).toBe(3)
      expect(tracker.pagesDebt).toBe(7)
    })
  })
})
