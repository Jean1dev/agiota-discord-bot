import {
  foodCategoryIds,
  isFoodCategory,
  isExpense,
  isTransactionInMonth,
  monthlyFoodTransactions,
  totalFoodSpendingCents,
  transactionSummary,
} from '../../../../src/services/finance/foodSpendingCalculation'

describe('foodSpendingCalculation', () => {
  it('reconhece as quatro categorias de alimentacao', () => {
    expect(isFoodCategory({ name: 'Bares e restaurantes' })).toBe(true)
    expect(isFoodCategory({ name: 'Alimentação' })).toBe(true)
    expect(isFoodCategory({ name: 'Meu Almoco' })).toBe(true)
    expect(isFoodCategory({ name: 'Mercado' })).toBe(true)
    expect(isFoodCategory({ name: 'Transporte' })).toBe(false)
    expect(isFoodCategory({ name: 'Saúde' })).toBe(false)
    expect(isFoodCategory({})).toBe(false)
  })

  it('coleta ids das categorias de comida', () => {
    const ids = foodCategoryIds([
      { id: 1, name: 'Bares e restaurantes' },
      { id: 2, name: 'Transporte' },
      { id: 3, name: 'Mercado' },
      { id: 4, name: 'Alimentação' },
      { id: 5, name: 'Saúde' },
      { id: 6, name: 'Meu Almoco' },
    ])
    expect(ids).toEqual(new Set([1, 3, 4, 6]))
    expect(foodCategoryIds([])).toEqual(new Set())
  })

  it('identifica despesa apenas com amount_cents negativo', () => {
    expect(isExpense({ amount_cents: 100 })).toBe(false)
    expect(isExpense({ amount_cents: -500 })).toBe(true)
    expect(isExpense({ amount_cents: 0 })).toBe(false)
    expect(isExpense({})).toBe(false)
  })

  it('filtra pelo mes da data ISO', () => {
    expect(isTransactionInMonth({ date: '2026-04-10' }, 2026, 4)).toBe(true)
    expect(isTransactionInMonth({ date: '2026-04-10' }, 2026, 3)).toBe(false)
    expect(isTransactionInMonth({ date: '2025-04-10' }, 2026, 4)).toBe(false)
    expect(isTransactionInMonth({}, 2026, 4)).toBe(false)
  })

  it('soma o absoluto dos centavos', () => {
    expect(totalFoodSpendingCents([
      { amount_cents: -5000 },
      { amount_cents: -3000 },
      { amount_cents: -2000 },
    ])).toBe(10000)
    expect(totalFoodSpendingCents([])).toBe(0)
    expect(totalFoodSpendingCents([{ amount_cents: -1365 }])).toBe(1365)
  })

  it('inclui so despesas de comida do mes corrente', () => {
    const categories = [
      { id: 1, name: 'Bares e restaurantes' },
      { id: 2, name: 'Transporte' },
      { id: 3, name: 'Mercado' },
    ]
    const transactions = [
      { id: 101, category_id: 1, amount_cents: -5000, date: '2026-04-10', description: 'Restaurante X' },
      { id: 102, category_id: 2, amount_cents: -2000, date: '2026-04-10', description: 'Uber' },
      { id: 103, category_id: 3, amount_cents: -3000, date: '2026-04-10', description: 'Supermercado' },
      { id: 104, category_id: 1, amount_cents: -1000, date: '2026-03-10', description: 'Bar mes anterior' },
      { id: 105, category_id: 1, amount_cents: 1000, date: '2026-04-10', description: 'Estorno restaurante' },
    ]
    const result = monthlyFoodTransactions(categories, transactions, 2026, 4)
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id).sort()).toEqual([101, 103])
  })

  it('inclui as quatro categorias de comida', () => {
    const categories = [
      { id: 10, name: 'Bares e restaurantes' },
      { id: 11, name: 'Alimentação' },
      { id: 12, name: 'Meu Almoco' },
      { id: 13, name: 'Mercado' },
    ]
    const date = '2026-09-09'
    const transactions = [
      { id: 1, category_id: 10, amount_cents: -1000, date, description: 'Bar' },
      { id: 2, category_id: 11, amount_cents: -2000, date, description: 'Alimentação' },
      { id: 3, category_id: 12, amount_cents: -3000, date, description: 'Almoço' },
      { id: 4, category_id: 13, amount_cents: -4000, date, description: 'Mercado' },
    ]
    const result = monthlyFoodTransactions(categories, transactions, 2026, 9)
    expect(result).toHaveLength(4)
    expect(totalFoodSpendingCents(result)).toBe(10000)
  })

  it('monta resumo do item', () => {
    expect(transactionSummary({
      id: 42,
      description: 'Restaurante Fino',
      date: '2026-04-10',
      amount_cents: -15000,
      category_id: 1,
    })).toEqual({
      id: 42,
      description: 'Restaurante Fino',
      date: '2026-04-10',
      amount_cents: -15000,
      category_id: 1,
    })
  })
})
