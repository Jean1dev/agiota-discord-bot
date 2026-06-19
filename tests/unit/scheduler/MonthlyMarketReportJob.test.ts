// Evita a validação de env (process.exit) ao importar o job e suas dependências.
jest.mock('../../../src/config/env', () => ({ env: {} }))

import {
  ehUltimoDiaDoMes,
  formatMonth,
} from '../../../src/scheduler/jobs/MonthlyMarketReportJob'

describe('ehUltimoDiaDoMes', () => {
  it('retorna true no último dia de um mês de 30 dias', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 5, 30))).toBe(true) // 30/jun
  })

  it('retorna true no último dia de um mês de 31 dias', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 6, 31))).toBe(true) // 31/jul
  })

  it('retorna true em 28/fev de ano não bissexto', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 1, 28))).toBe(true)
  })

  it('retorna true em 29/fev de ano bissexto', () => {
    expect(ehUltimoDiaDoMes(new Date(2024, 1, 29))).toBe(true)
  })

  it('retorna false em um dia no meio do mês', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 5, 15))).toBe(false)
  })

  it('retorna false no penúltimo dia do mês', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 5, 29))).toBe(false)
  })
})

describe('formatMonth', () => {
  it('formata como YYYY-MM com zero à esquerda', () => {
    expect(formatMonth(new Date(2026, 5, 30))).toBe('2026-06')
  })

  it('formata dezembro corretamente', () => {
    expect(formatMonth(new Date(2026, 11, 31))).toBe('2026-12')
  })
})
