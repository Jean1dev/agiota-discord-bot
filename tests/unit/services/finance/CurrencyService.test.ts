import axios from 'axios'
import { clearRateCache, fetchUsdToBrlRate, resolveMoneyToBrl } from '../../../../src/services/finance/CurrencyService'

jest.mock('axios')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ debug: jest.fn(), error: jest.fn() }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
  jest.clearAllMocks()
  clearRateCache()
})

describe('fetchUsdToBrlRate', () => {
  it('retorna a cotação do dólar corretamente', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { usd: 5.50 } })

    const rate = await fetchUsdToBrlRate()

    expect(rate).toBe(5.5)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.arbitragem-crypto.cloud/v1/dollar',
      expect.objectContaining({ timeout: 25000 })
    )
  })

  it('usa cache na segunda chamada sem bater na API', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { usd: 5.50 } })

    await fetchUsdToBrlRate()
    const rate = await fetchUsdToBrlRate()

    expect(rate).toBe(5.5)
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  it('propaga o erro quando a API falha', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'))

    await expect(fetchUsdToBrlRate()).rejects.toThrow('network error')
  })
})

describe('resolveMoneyToBrl', () => {
  it('retorna o valor em BRL sem chamar a API quando não há usd', async () => {
    const result = await resolveMoneyToBrl('23.55')

    expect(result.brlValue).toBe(23.55)
    expect(result.conversionInfo).toBeUndefined()
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('converte valor USD para BRL buscando a cotação online', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { usd: 5.50 } })

    const result = await resolveMoneyToBrl('23.44usd')

    expect(result.brlValue).toBe(128.92)
    expect(result.conversionInfo).toBe('USD 23.44 → R$ 128.92 (cotação: R$ 5.50)')
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  it('múltiplas conversões USD reutilizam o cache — API chamada apenas uma vez', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { usd: 5.50 } })

    await resolveMoneyToBrl('10usd')
    await resolveMoneyToBrl('20usd')
    await resolveMoneyToBrl('30usd')

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  it('aceita usd em maiúsculas', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { usd: 5.00 } })

    const result = await resolveMoneyToBrl('10USD')

    expect(result.brlValue).toBe(50)
    expect(result.conversionInfo).toContain('USD 10.00 → R$ 50.00')
  })

  it('propaga o erro da API para o chamador tratar', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))

    await expect(resolveMoneyToBrl('10usd')).rejects.toThrow('timeout')
  })
})
