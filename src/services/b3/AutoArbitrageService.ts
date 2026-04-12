import { contextInstance } from '../../context'
import { asyncArbitrage, forceArbitrage } from './CryptoArbitrageService'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('AutoArbitrageService')

const state = {
    isRunning: false,
    REQUEST_INTERVAL: 50000,
    quantities: 10,
}

function randomNumberUntil(max: number): number {
    return Math.floor(Math.random() * max)
}

function clearState(): void {
    state.isRunning = false
}

async function execute(count: number): Promise<void> {
    if (state.isRunning) {
        return
    }

    setTimeout(async () => {
        if (count >= state.quantities) {
            clearState()
            return
        }

        state.isRunning = true
        await asyncArbitrage()
        clearState()
        execute(count + 1)
    }, state.REQUEST_INTERVAL)
}

export function startAutomateAfterNewSubscription(): void {
    if (contextInstance().autoArbitragem) {
        return
    }

    forceArbitrage(155, (message: string) => {
        log.info({ message }, 'Arbitragem forçada após nova assinatura')
    })
}

export function startAutoArbitrage(): void {
    if (!contextInstance().autoArbitragem) {
        return
    }

    const quantities = randomNumberUntil(100)
    state.quantities = quantities
    log.info({ quantities }, 'Iniciando arbitragem')
    execute(0)
}
