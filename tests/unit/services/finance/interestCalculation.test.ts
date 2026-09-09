import {
  interestCentsForTransaction,
  isExpense,
  isRecargapayTransaction,
  isTransactionInMonth,
  monthlyRecargapayTransactions,
  totalInterestCents,
  transactionSummaryForConference,
} from '../../../../src/services/finance/interestCalculation'

describe('interestCalculation', () => {
  it('identifica despesa apenas com amount_cents negativo', () => {
    expect(isExpense({ amount_cents: 100 })).toBe(false)
    expect(isExpense({ amount_cents: -1365 })).toBe(true)
    expect(isExpense({ amount_cents: 0 })).toBe(false)
    expect(isExpense({})).toBe(false)
  })

  it('detecta RECARGAPAY na descricao sem diferenciar maiusculas', () => {
    expect(isRecargapayTransaction({ description: 'RECARGAPAY *JEANLUCAF' })).toBe(true)
    expect(isRecargapayTransaction({ description: 'recargapay *foo' })).toBe(true)
    expect(isRecargapayTransaction({ description: 'Other payment' })).toBe(false)
    expect(isRecargapayTransaction({})).toBe(false)
  })

  it('filtra transacoes pelo ano/mes da data ISO', () => {
    expect(isTransactionInMonth({ date: '2026-02-05' }, 2026, 2)).toBe(true)
    expect(isTransactionInMonth({ date: '2026-02-05' }, 2026, 1)).toBe(false)
    expect(isTransactionInMonth({ date: '2026-01-15' }, 2026, 2)).toBe(false)
    expect(isTransactionInMonth({}, 2026, 2)).toBe(false)
  })

  it('calcula 4% truncado: 1365 cents -> 54', () => {
    expect(interestCentsForTransaction({ amount_cents: -1365 })).toBe(54)
    expect(interestCentsForTransaction({ amount_cents: -1000 })).toBe(40)
    expect(interestCentsForTransaction({ amount_cents: 0 })).toBe(0)
  })

  it('soma juros das transacoes', () => {
    expect(totalInterestCents([{ amount_cents: -1000 }, { amount_cents: -500 }])).toBe(60)
    expect(totalInterestCents([])).toBe(0)
  })

  it('mantem so despesas RecargaPay do mes', () => {
    const transactions = [
      { description: 'RECARGAPAY *A', amount_cents: -1000, date: '2026-02-05' },
      { description: 'RECARGAPAY *B', amount_cents: -500, date: '2026-02-10' },
      { description: 'Other', amount_cents: -200, date: '2026-01-15' },
      { description: 'RECARGAPAY *C', amount_cents: 100, date: '2026-02-05' },
    ]
    const result = monthlyRecargapayTransactions(transactions, 2026, 2)
    expect(result).toHaveLength(2)
    expect(result.every(tx => /RECARGAPAY/i.test(tx.description ?? ''))).toBe(true)
    expect(result.every(tx => (tx.amount_cents ?? 0) < 0)).toBe(true)
  })

  it('monta resumo com interest_cents para conferencia', () => {
    const summary = transactionSummaryForConference({
      id: 1,
      description: 'RECARGAPAY *X',
      date: '2026-02-05',
      amount_cents: -1000,
    })
    expect(summary).toEqual({
      id: 1,
      description: 'RECARGAPAY *X',
      date: '2026-02-05',
      amount_cents: -1000,
      interest_cents: 40,
    })
  })
})
