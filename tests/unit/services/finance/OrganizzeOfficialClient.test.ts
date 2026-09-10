import axios from 'axios'
import { env } from '../../../../src/config/env'
import {
  fetchOfficialCategories,
  fetchOfficialTransactions,
  MissingOrganizzeCredentialsError,
} from '../../../../src/services/finance/OrganizzeOfficialClient'

jest.mock('axios')
jest.mock('../../../../src/config/env', () => ({
  env: {
    ORGANIZZE_API_BASE_URL: 'https://api.organizze.com.br/rest/v2',
    ORGANIZZE_BASIC_USERNAME: 'user@example.com',
    ORGANIZZE_BASIC_PASSWORD: 'secret-token',
    ORGANIZZE_USER_AGENT: undefined as string | undefined,
  },
}))
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>
const organizzeEnv = env as {
  ORGANIZZE_API_BASE_URL: string
  ORGANIZZE_BASIC_USERNAME: string | undefined
  ORGANIZZE_BASIC_PASSWORD: string | undefined
  ORGANIZZE_USER_AGENT: string | undefined
}

describe('OrganizzeOfficialClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    organizzeEnv.ORGANIZZE_API_BASE_URL = 'https://api.organizze.com.br/rest/v2'
    organizzeEnv.ORGANIZZE_BASIC_USERNAME = 'user@example.com'
    organizzeEnv.ORGANIZZE_BASIC_PASSWORD = 'secret-token'
    organizzeEnv.ORGANIZZE_USER_AGENT = undefined
  })

  it('nao chama a API quando as credenciais estao ausentes', async () => {
    organizzeEnv.ORGANIZZE_BASIC_USERNAME = undefined
    organizzeEnv.ORGANIZZE_BASIC_PASSWORD = undefined

    await expect(fetchOfficialCategories()).rejects.toBeInstanceOf(MissingOrganizzeCredentialsError)
    await expect(fetchOfficialTransactions('2026-09-01', '2026-09-30')).rejects.toBeInstanceOf(
      MissingOrganizzeCredentialsError,
    )
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('busca categorias com Basic Auth e User-Agent', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 1, name: 'Mercado', kind: 'expenses' }],
    })

    const categories = await fetchOfficialCategories()

    expect(categories).toEqual([{ id: 1, name: 'Mercado', kind: 'expenses' }])
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.organizze.com.br/rest/v2/categories',
      expect.objectContaining({
        timeout: 30_000,
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('user@example.com:secret-token', 'utf8').toString('base64')}`,
          'User-Agent': 'user@example.com',
        }),
      }),
    )
    const url = String(mockedAxios.get.mock.calls[0]?.[0] ?? '')
    expect(url).not.toContain('organizze-service')
    expect(url).not.toContain('herokuapp.com')
  })

  it('pagina transacoes ate a pagina vazia', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ id: 1, description: 'A', date: '2026-09-01', amount_cents: -100, category_id: 2 }],
      })
      .mockResolvedValueOnce({
        data: [{ id: 2, description: 'B', date: '2026-09-02', amount_cents: -200, category_id: 2 }],
      })
      .mockResolvedValueOnce({ data: [] })

    const txs = await fetchOfficialTransactions('2026-09-01', '2026-09-30')

    expect(txs.map(t => t.id)).toEqual([1, 2])
    expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      1,
      'https://api.organizze.com.br/rest/v2/transactions',
      expect.objectContaining({
        params: { start_date: '2026-09-01', end_date: '2026-09-30', page: 1 },
      }),
    )
  })
})
