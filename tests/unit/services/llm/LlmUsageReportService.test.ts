import axios from 'axios'

jest.mock('axios')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))
const mockEnv: Record<string, string | undefined> = {}
jest.mock('../../../../src/config/env', () => ({ env: mockEnv }))

import {
  apiKeyLabel,
  buildUsageReport,
  fetchDailyActivity,
  fetchUsageReport,
  formatUsd,
  gatewayBaseUrl,
  lastDaysUtcRange,
  LlmDailyActivityResponse,
} from '../../../../src/services/llm/LlmUsageReportService'

const mockedAxios = axios as jest.Mocked<typeof axios>

const metrics = (spend: number, req: number, failed = 0) => ({
  spend,
  prompt_tokens: req * 100,
  completion_tokens: req * 20,
  total_tokens: req * 120,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  api_requests: req,
  successful_requests: req - failed,
  failed_requests: failed,
})

beforeEach(() => {
  jest.clearAllMocks()
  for (const k of Object.keys(mockEnv)) delete mockEnv[k]
})

describe('lastDaysUtcRange', () => {
  it('calcula os últimos 7 dias em UTC, inclusive hoje', () => {
    // 01:00 UTC de 30/09 ainda é 29/09 em São Paulo — deve usar a data UTC
    expect(lastDaysUtcRange(7, new Date('2026-09-30T01:00:00Z'))).toEqual({
      startDate: '2026-09-24',
      endDate: '2026-09-30',
    })
  })

  it('cruza virada de mês', () => {
    expect(lastDaysUtcRange(30, new Date('2026-10-05T12:00:00Z'))).toEqual({
      startDate: '2026-09-06',
      endDate: '2026-10-05',
    })
  })
})

describe('formatUsd', () => {
  it('usa 4 casas para valores pequenos e 2 para maiores', () => {
    expect(formatUsd(0.00081)).toBe('$0.0008')
    expect(formatUsd(12.3456)).toBe('$12.35')
    expect(formatUsd(0)).toBe('$0.00')
  })
})

describe('apiKeyLabel', () => {
  it('usa o alias ou os 8 primeiros caracteres do hash', () => {
    expect(apiKeyLabel('abcdef1234567890', 'bot')).toBe('bot')
    expect(apiKeyLabel('abcdef1234567890', '')).toBe('abcdef12')
    expect(apiKeyLabel('abcdef1234567890', null)).toBe('abcdef12')
  })
})

describe('buildUsageReport', () => {
  const response: LlmDailyActivityResponse = {
    results: [
      {
        date: '2026-09-25',
        metrics: metrics(0.5, 10, 1),
        breakdown: {
          models: {
            'openai/gpt-4o-mini': { metrics: metrics(0.1, 8), metadata: {} },
            'openai/gpt-4o': { metrics: metrics(0.4, 2), metadata: {} },
          },
          providers: { openai: { metrics: metrics(0.5, 10), metadata: {} } },
          api_keys: {
            hash1111aaaa: { metrics: metrics(0.3, 6), metadata: { key_alias: '' } },
            hash2222bbbb: { metrics: metrics(0.2, 4), metadata: { key_alias: 'discord-bot' } },
          },
        },
      },
      {
        date: '2026-09-27',
        metrics: metrics(0.2, 5),
        breakdown: {
          models: { 'openai/gpt-4o-mini': { metrics: metrics(0.2, 5), metadata: {} } },
          providers: { openai: { metrics: metrics(0.2, 5), metadata: {} } },
          api_keys: { hash2222bbbb: { metrics: metrics(0.2, 5), metadata: { key_alias: 'discord-bot' } } },
        },
      },
    ],
  }

  it('preenche dias faltantes com zero e soma totais', () => {
    const report = buildUsageReport(response, '2026-09-24', '2026-09-30')

    expect(report.days.map(d => d.date)).toEqual([
      '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30',
    ])
    expect(report.days[0]!.metrics.api_requests).toBe(0)
    expect(report.days[1]!.metrics.spend).toBeCloseTo(0.5)
    expect(report.totals.spend).toBeCloseTo(0.7)
    expect(report.totals.api_requests).toBe(15)
    expect(report.totals.failed_requests).toBe(1)
    expect(report.isEmpty).toBe(false)
  })

  it('agrega breakdowns entre dias e ordena por gasto', () => {
    const report = buildUsageReport(response, '2026-09-24', '2026-09-30')

    expect(report.models.map(m => m.name)).toEqual(['openai/gpt-4o', 'openai/gpt-4o-mini'])
    expect(report.models[1]!.metrics.spend).toBeCloseTo(0.3)
    expect(report.providers).toHaveLength(1)
    expect(report.apiKeys.map(k => k.name)).toEqual(['discord-bot', 'hash1111'])
  })

  it('marca como vazio quando não há resultados', () => {
    const report = buildUsageReport({ results: [] }, '2026-09-24', '2026-09-30')
    expect(report.isEmpty).toBe(true)
    expect(report.days).toHaveLength(7)
    expect(report.models).toEqual([])
  })
})

describe('gatewayBaseUrl', () => {
  it('prefere LLM_GATEWAY_URL e cai para LITELLM_BASE_URL sem /v1', () => {
    mockEnv.LITELLM_BASE_URL = 'https://gw.example.com/v1'
    expect(gatewayBaseUrl()).toBe('https://gw.example.com')
    mockEnv.LLM_GATEWAY_URL = 'https://admin.example.com'
    expect(gatewayBaseUrl()).toBe('https://admin.example.com')
  })
})

describe('fetchDailyActivity', () => {
  it('falha sem configuração', async () => {
    await expect(fetchDailyActivity('2026-09-24', '2026-09-30')).rejects.toThrow('não configurado')
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('chama o endpoint com master key e datas', async () => {
    mockEnv.LLM_GATEWAY_URL = 'https://gw.example.com'
    mockEnv.LLM_GATEWAY_MASTER_KEY = 'sk-master'
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } })

    await fetchDailyActivity('2026-09-24', '2026-09-30')

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://gw.example.com/user/daily/activity',
      expect.objectContaining({
        params: { start_date: '2026-09-24', end_date: '2026-09-30' },
        headers: { Authorization: 'Bearer sk-master' },
      }),
    )
  })

  it('traduz erro da API com a mensagem do gateway', async () => {
    mockEnv.LLM_GATEWAY_URL = 'https://gw.example.com'
    mockEnv.LLM_GATEWAY_MASTER_KEY = 'bad'
    const err = Object.assign(new Error('Request failed'), {
      response: { status: 401, data: { error: { message: 'invalid key', type: 'auth', code: '401' } } },
    })
    mockedAxios.get.mockRejectedValueOnce(err)
    mockedAxios.isAxiosError.mockReturnValueOnce(true)

    await expect(fetchDailyActivity('2026-09-24', '2026-09-30')).rejects.toThrow('respondeu 401: invalid key')
  })
})

describe('fetchUsageReport', () => {
  it('busca os últimos 7 dias e monta o relatório', async () => {
    mockEnv.LLM_GATEWAY_URL = 'https://gw.example.com'
    mockEnv.LLM_GATEWAY_MASTER_KEY = 'sk-master'
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } })

    const report = await fetchUsageReport(7, new Date('2026-09-28T11:15:00Z'))

    expect(report.startDate).toBe('2026-09-22')
    expect(report.endDate).toBe('2026-09-28')
    expect(report.isEmpty).toBe(true)
  })
})
