const { DISABLE_AUTO_ARBITRAGE } = require("../config");
const { asyncArbitrage } = require("./cryptoArbitrageService");

const state = {
    isRunning: false,
    REQUEST_INTERVAL: 26000,
    quantities: 10,
}

function randomNumberUntil(max) {
    return Math.floor(Math.random() * max);
}

function clearState() {
    state.isRunning = false;
}

async function execute(count) {
    if (state.isRunning) {
        return;
    }

    setTimeout(async () => { 
        if (count >= state.quantities) {
            clearState();
            return;
        }

        state.isRunning = true;
        await asyncArbitrage();
        clearState();
        execute(count + 1);
    }, state.REQUEST_INTERVAL);
}

function startAutoArbitrage() {
    if (DISABLE_AUTO_ARBITRAGE && DISABLE_AUTO_ARBITRAGE === 'true') {
        return;
    }

    const quantities = randomNumberUntil(100);
    state.quantities = quantities;
    console.log(`Iniciando arbitragem com ${quantities} requisições`);
    execute(0);
}

module.exports = {
    startAutoArbitrage
}