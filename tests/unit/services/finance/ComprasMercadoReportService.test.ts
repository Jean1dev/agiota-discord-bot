import axios from 'axios'
import { fetchMonthlyReport } from '../../../../src/services/finance/ComprasMercadoReportService'

jest.mock('axios')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))
// Evita rodar a validação de env (process.exit) ao importar o service.
jest.mock('../../../../src/config/env', () => ({ env: {} }))

const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchMonthlyReport', () => {
  const report = {
    totalSpent: 1234.5,
    purchaseCount: 7,
    averageTicket: 176.36,
    itemCount: 42,
    topStore: { store: 'Mercado X', totalSpent: 800 },
    storeRanking: [],
    spendingByCategory: [],
  }

  it('chama o endpoint /reports/:month e retorna os dados', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: report })

    const result = await fetchMonthlyReport('2026-06')

    expect(result).toEqual(report)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://merchant-receipt-analysis-8c20061837f6.herokuapp.com/reports/2026-06',
      expect.objectContaining({ timeout: 30_000 }),
    )
  })

  it('propaga o erro quando a API falha', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'))

    await expect(fetchMonthlyReport('2026-06')).rejects.toThrow('network error')
  })
})
