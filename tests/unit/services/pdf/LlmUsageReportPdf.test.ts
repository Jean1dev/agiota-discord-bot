import fs from 'fs'

jest.mock('../../../../src/config/env', () => ({ env: {} }))
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

import { buildUsageReport } from '../../../../src/services/llm/LlmUsageReportService'
import { diaMesLabel, gerarPdfUsoLlm, nomeArquivoRelatorioLlm } from '../../../../src/services/pdf/LlmUsageReportPdf'

const m = (spend: number, req: number) => ({
  spend,
  prompt_tokens: req * 100,
  completion_tokens: req * 10,
  total_tokens: req * 110,
  api_requests: req,
  successful_requests: req,
  failed_requests: 0,
})

async function waitForFile(file: string): Promise<Buffer> {
  for (let i = 0; i < 50; i++) {
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file)
      if (buf.subarray(-8).toString().includes('%%EOF')) return buf
    }
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error('PDF não foi gerado')
}

describe('LlmUsageReportPdf', () => {
  const created: string[] = []
  afterAll(() => created.forEach(f => fs.existsSync(f) && fs.unlinkSync(f)))

  it('formata rótulos', () => {
    expect(diaMesLabel('2026-09-30')).toBe('30/09')
    expect(nomeArquivoRelatorioLlm({ startDate: '2026-09-24', endDate: '2026-09-30' }))
      .toBe('uso-litellm-2026-09-24_a_2026-09-30.pdf')
  })

  it('gera o dashboard com dados', async () => {
    const report = buildUsageReport({
      results: [{
        date: '2026-09-25',
        metrics: m(0.00081, 3),
        breakdown: {
          models: { 'openai/gpt-4o-mini': { metrics: m(0.00081, 3) } },
          providers: { openai: { metrics: m(0.00081, 3) } },
          api_keys: { abcdef1234: { metrics: m(0.00081, 3), metadata: { key_alias: '' } } },
        },
      }],
    }, '2026-09-24', '2026-09-30')

    const file = gerarPdfUsoLlm(report)
    created.push(file)
    const buf = await waitForFile(file)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('gera o estado vazio', async () => {
    const file = gerarPdfUsoLlm(buildUsageReport({ results: [] }, '2026-09-24', '2026-09-30'))
    created.push(file)
    const buf = await waitForFile(file)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })
})
