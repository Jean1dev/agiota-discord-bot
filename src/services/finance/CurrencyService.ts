import axios from 'axios'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('CurrencyService')

export async function fetchUsdToBrlRate(): Promise<number> {
    const response = await axios.get('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const rate = parseFloat(response.data.USDBRL.bid)
    log.debug({ rate }, 'USD to BRL rate fetched')
    return rate
}
