import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('CurrencyService')

export async function fetchUsdToBrlRate(): Promise<number> {
    const response = await axios.get('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const rate = parseFloat(response.data.USDBRL.bid)
    log.debug({ rate }, 'USD to BRL rate fetched')
    return rate
}

export async function resolveMoneyToBrl(rawMoney: string): Promise<{ brlValue: number; conversionInfo?: string }> {
    const isUsd = rawMoney.toLowerCase().includes('usd')
    if (!isUsd) {
        return { brlValue: Number(rawMoney.trim()) }
    }
    const usdValue = Number(rawMoney.toLowerCase().replace('usd', '').trim())
    if (isNaN(usdValue)) {
        return { brlValue: NaN }
    }
    const rate = await fetchUsdToBrlRate()
    const brlValue = parseFloat((usdValue * rate).toFixed(2))
    const conversionInfo = `USD ${usdValue.toFixed(2)} → R$ ${brlValue.toFixed(2)} (cotação: R$ ${rate.toFixed(2)})`
    return { brlValue, conversionInfo }
}
