jest.mock('../../../src/config/env', () => ({ env: {} }))

import { MonthlyMarketReportJob, ehUltimoDiaDoMes, formatMonth } from '../../../src/scheduler/jobs/MonthlyMarketReportJob'
import * as OrganizzeService from '../../../src/services/finance/OrganizzeService'
import { fetchMonthlyReport } from '../../../src/services/finance/ComprasMercadoReportService'
import { gerarPdfRelatorioMensalCompras } from '../../../src/services/pdf/MonthlyMarketReportPdf'
import { upload } from '../../../src/services/upload/UploadService'
import { sendEmail } from '../../../src/services/email/EmailService'

jest.mock('../../../src/services/finance/OrganizzeService')
jest.mock('../../../src/services/finance/ComprasMercadoReportService')
jest.mock('../../../src/services/pdf/MonthlyMarketReportPdf', () => ({
  gerarPdfRelatorioMensalCompras: jest.fn(() => '/tmp/report.pdf'),
  mesAnoLabel: jest.fn(() => 'junho/2026'),
}))
jest.mock('../../../src/services/upload/UploadService', () => ({
  upload: jest.fn(),
}))
jest.mock('../../../src/services/email/EmailService', () => ({
  sendEmail: jest.fn(),
}))
jest.mock('../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

const mockedOrganizze = OrganizzeService as jest.Mocked<typeof OrganizzeService>
const mockedFetchMonthlyReport = fetchMonthlyReport as jest.MockedFunction<typeof fetchMonthlyReport>
const mockedUpload = upload as jest.MockedFunction<typeof upload>
const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>

describe('ehUltimoDiaDoMes', () => {
  it('retorna true no último dia de um mês de 30 dias', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 5, 30))).toBe(true)
  })

  it('retorna true no último dia de um mês de 31 dias', () => {
    expect(ehUltimoDiaDoMes(new Date(2026, 6, 31))).toBe(true)
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

describe('MonthlyMarketReportJob', () => {
  const job = new MonthlyMarketReportJob()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 5, 30, 23, 30, 0))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('não executa fora do último dia do mês', async () => {
    jest.setSystemTime(new Date(2026, 5, 15, 23, 30, 0))

    await job.run()

    expect(mockedOrganizze.getMonthlySummary).not.toHaveBeenCalled()
    expect(mockedFetchMonthlyReport).not.toHaveBeenCalled()
  })

  it('consulta /monthly-summary e envia relatório de mercado no último dia do mês', async () => {
    mockedOrganizze.getMonthlySummary.mockResolvedValueOnce({
      data: [{ year: 2026, month: 6, interest_cents: 4200, food_spending_cents: 85000 }],
    })
    mockedFetchMonthlyReport.mockResolvedValueOnce({
      totalSpent: 1000,
      purchaseCount: 5,
      averageTicket: 200,
      itemCount: 20,
      topStore: { store: 'Mercado X', totalSpent: 600 },
      storeRanking: [],
      spendingByCategory: [],
    })
    mockedUpload.mockResolvedValueOnce('https://storage.example/report.pdf')

    const runPromise = job.run()
    await jest.runAllTimersAsync()
    await runPromise

    expect(mockedOrganizze.getMonthlySummary).toHaveBeenCalledWith(2026, 6)
    expect(mockedFetchMonthlyReport).toHaveBeenCalledWith('2026-06')
    expect(gerarPdfRelatorioMensalCompras).toHaveBeenCalled()
    expect(mockedSendEmail).toHaveBeenCalledTimes(2)
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Resumo financeiro') }),
    )
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('compras de mercado') }),
    )
  })
})
