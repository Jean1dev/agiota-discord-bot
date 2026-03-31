import { DebtUser } from '../../../../src/domain/debt/DebtUser'

describe('DebtUser', () => {
  const makeUser = () => new DebtUser('<@123456>', [], [])

  describe('construção', () => {
    it('lança erro se userId estiver vazio', () => {
      expect(() => new DebtUser('', [], [])).toThrow('userId é obrigatório')
    })

    it('cria usuário sem dívidas nem pagamentos', () => {
      const user = makeUser()
      expect(user.totalOwed).toBe(0)
      expect(user.hasActiveDebt).toBe(false)
    })
  })

  describe('addDebt', () => {
    it('retorna nova instância sem mutar a original', () => {
      const original = makeUser()
      const updated = original.addDebt(100, 'Almoço', 'Jean')

      expect(original.totalOwed).toBe(0)
      expect(updated.totalOwed).toBe(100)
    })

    it('acumula múltiplas dívidas corretamente', () => {
      const user = makeUser()
        .addDebt(100, 'Almoço', 'Jean')
        .addDebt(50, 'Uber', 'Jean')

      expect(user.totalOwed).toBe(150)
      expect(user.debts).toHaveLength(2)
    })

    it('lança erro para valor negativo', () => {
      expect(() => makeUser().addDebt(-10, 'Teste', 'Jean'))
        .toThrow('Valor da dívida deve ser maior que zero')
    })

    it('lança erro para valor zero', () => {
      expect(() => makeUser().addDebt(0, 'Teste', 'Jean'))
        .toThrow('Valor da dívida deve ser maior que zero')
    })

    it('lança erro se credor estiver vazio', () => {
      expect(() => makeUser().addDebt(100, 'Teste', ''))
        .toThrow('Nome do credor é obrigatório')
    })
  })

  describe('recordPayment', () => {
    it('reduz o saldo devedor', () => {
      const user = makeUser().addDebt(100, 'Teste', 'Jean').recordPayment(60)
      expect(user.totalOwed).toBe(40)
    })

    it('zera o saldo quando pagamento igual à dívida', () => {
      const user = makeUser().addDebt(100, 'Teste', 'Jean').recordPayment(100)
      expect(user.totalOwed).toBe(0)
      expect(user.hasActiveDebt).toBe(false)
    })

    it('permite pagamento que excede a dívida (crédito)', () => {
      const user = makeUser().addDebt(100, 'Teste', 'Jean').recordPayment(150)
      expect(user.totalOwed).toBe(-50)
      expect(user.hasActiveDebt).toBe(false)
    })

    it('lança erro para valor negativo', () => {
      const user = makeUser().addDebt(100, 'Teste', 'Jean')
      expect(() => user.recordPayment(-10)).toThrow('Valor do pagamento deve ser maior que zero')
    })

    it('retorna nova instância sem mutar a original', () => {
      const withDebt = makeUser().addDebt(100, 'Teste', 'Jean')
      const afterPayment = withDebt.recordPayment(40)

      expect(withDebt.totalOwed).toBe(100)
      expect(afterPayment.totalOwed).toBe(60)
    })
  })

  describe('hasActiveDebt', () => {
    it('é false quando não há dívidas', () => {
      expect(makeUser().hasActiveDebt).toBe(false)
    })

    it('é true quando há saldo devedor', () => {
      expect(makeUser().addDebt(50, 'X', 'Jean').hasActiveDebt).toBe(true)
    })

    it('é false após quitar a dívida', () => {
      const user = makeUser().addDebt(50, 'X', 'Jean').recordPayment(50)
      expect(user.hasActiveDebt).toBe(false)
    })
  })

  describe('totais', () => {
    it('calcula totalDebts corretamente', () => {
      const user = makeUser().addDebt(100, 'A', 'Jean').addDebt(200, 'B', 'Jean')
      expect(user.totalDebts).toBe(300)
    })

    it('calcula totalPaid corretamente', () => {
      const user = makeUser()
        .addDebt(300, 'A', 'Jean')
        .recordPayment(100)
        .recordPayment(50)
      expect(user.totalPaid).toBe(150)
      expect(user.totalOwed).toBe(150)
    })
  })
})
