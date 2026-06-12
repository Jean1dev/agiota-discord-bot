import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MerchantReceiptService')

const RECEIPTS_ENDPOINT =
  'https://merchant-receipt-analysis-8c20061837f6.herokuapp.com/receipts'

export interface MerchantReceiptResult {
  success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  reason?: string
}

export async function analyzeMerchantReceipt(imageUrl: string): Promise<MerchantReceiptResult> {
  try {
    const response = await axios.post(
      RECEIPTS_ENDPOINT,
      { imageUrl },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    log.info({ status: response.status }, 'Merchant receipt analyzed')
    return { success: true, data: response.data }
  } catch (err) {
    log.error({ err }, 'Error analyzing merchant receipt')
    return { success: false, reason: (err as Error).message }
  }
}
