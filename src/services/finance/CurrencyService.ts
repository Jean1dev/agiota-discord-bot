import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('CurrencyService')

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
let rateCache: { rate: number; expiresAt: number } | null = null

export function clearRateCache(): void {
    rateCache = null
}

export async function fetchUsdToBrlRate(): Promise<number> {
    if (rateCache && Date.now() < rateCache.expiresAt) {
        log.debug({ rate: rateCache.rate }, 'USD to BRL rate from cache')
        return rateCache.rate
    }
    const response = await axios.get('https://api.arbitragem-crypto.cloud/v1/dollar', {
        timeout: 25000,
        headers: {
            'accept': 'application/json, text/plain, */*',
            'origin': 'https://arbitragem-crypto.cloud',
            'referer': 'https://arbitragem-crypto.cloud/',
        },
    })
    const rate = parseFloat(response.data.usd)
    rateCache = { rate, expiresAt: Date.now() + CACHE_TTL_MS }
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
