import { asyncArbitrage, forceArbitrage } from './CryptoArbitrageService'

function getContext() {
    return require('../../context').contextInstance()
}

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
    if (getContext().autoArbitragem) {
        return
    }

    forceArbitrage(155, (message: string) => {
        console.log(message)
    })
}

export function startAutoArbitrage(): void {
    if (!getContext().autoArbitragem) {
        return
    }

    const quantities = randomNumberUntil(100)
    state.quantities = quantities
    console.log(`Iniciando arbitragem com ${quantities} requisições`)
    execute(0)
}
