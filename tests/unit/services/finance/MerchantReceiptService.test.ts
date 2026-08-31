import axios from 'axios'
import { analyzeMerchantReceipt } from '../../../../src/services/finance/MerchantReceiptService'

jest.mock('axios')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn() }),
}))
jest.mock('../../../../src/config/env', () => ({
  env: { RECEIPT_WEBHOOK_URL: 'https://example.com/webhook' },
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('analyzeMerchantReceipt', () => {
  it('envia todas as imagens em uma única transação', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 202, data: { jobId: 'job-1' } })
    const imageUrls = [
      'https://example.com/receipt-1.jpg',
      'https://example.com/receipt-2.jpg',
    ]

    const result = await analyzeMerchantReceipt(imageUrls)

    expect(result).toEqual({ success: true, data: { jobId: 'job-1' } })
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://merchant-receipt-analysis-8c20061837f6.herokuapp.com/receipts',
      {
        imageUrls,
        webhookUrl: 'https://example.com/webhook',
      },
      expect.objectContaining({
        timeout: 55_000,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('retorna falha quando o serviço rejeita a requisição', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('network error'))

    await expect(analyzeMerchantReceipt(['https://example.com/receipt.jpg'])).resolves.toEqual({
      success: false,
      reason: 'network error',
    })
  })
})
