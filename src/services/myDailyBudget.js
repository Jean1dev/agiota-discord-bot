const { contextInstance } = require('../context')
const captureException = require('../observability/Sentry')
const { DbInstance } = require('../repository/mongodb')

const state = {
    budget: null,
    transactions: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const dailyBudgetGain = 55
const weekendBudgetGain = 155

async function fillState() {
    try {
        const coll = DbInstance()
            .collection(collectionName)

        const data = await coll
            .find({})
            .toArray()

        if (data.length == 0) {
            state.budget = 50
        } else {
            state.budget = data[0].budget
        }

        console.log(collectionName, 'filled')
    } catch (error) {
        captureException(error)
        throw new Error('Cannot load daily budget')
    }
}

function hojeEhFimDeSemana() {
    const dataAtual = new Date();
    const diaDaSemana = dataAtual.getDay();

    return diaDaSemana === 6 || diaDaSemana === 0;
}

function sendMessage(message) {
    const context = contextInstance()

    if (!context.telegramIds) {
        return
    }

    const item1 = context.telegramIds[0]
    item1.callback(item1.chatId, message)
}

function displayTransactionsToday() {
    if (state.transactions.length > 0) {
        const total = state.transactions
            .map(it => it.money)
            .reduce((sum, value) => sum + value, 0)

        if (total > 0) {
            const message = `Hoje voce gastou R$${total.toFixed(2)}`
            sendMessage(message)
        }
    }
}

function fecharCompetencia(ultimaData, dados, db) {
    const transactions = dados.map(item => ({
        date: item.date,
        money: item.money,
        description: item.description
    }))

    db.collection('fechamento_competencia').insertOne({
        periodoInicial: ultimaData,
        periodoFinal: new Date(),
        transactions
    }).then(() => {
        db.collection(collectionTransactionName).deleteMany({})
    })
}

function dailyHandles() {
    let newBudget
    const db = DbInstance()
    if (hojeEhFimDeSemana()) {
        newBudget = state.budget + weekendBudgetGain
    } else {
        newBudget = state.budget + dailyBudgetGain
    }

    displayTransactionsToday()

    db.collection(collectionTransactionName)
        .find({})
        .toArray()
        .then(result => {
            if (result.length === 0) {
                return
            }

            console.log(`${collectionTransactionName} quantidade `, result.length)
            const ultimoElemento = result[0]

            function calcularDiasAteHoje(data) {
                const dataAtual = new Date();
                const diferencaEmMilissegundos = dataAtual - data;
                const umDiaEmMilissegundos = 24 * 60 * 60 * 1000; // 1 dia em milissegundos

                const diferencaEmDias = Math.floor(diferencaEmMilissegundos / umDiaEmMilissegundos);
                return diferencaEmDias;
            }

            const diasAteHoje = calcularDiasAteHoje(ultimoElemento.date)
            const totalDespesas = result.map(it => Number(it.money)).reduce((sum, value) => sum + value, 0)
            const media = totalDespesas / diasAteHoje
            const message = `Nos ultimos ${diasAteHoje} dias voce gastou em media R$${media.toFixed(2)} por dia`
            sendMessage(message)

            if (diasAteHoje > 30) {
                fecharCompetencia(
                    ultimoElemento.date,
                    result,
                    db
                )
            }
        })

    db
        .collection(collectionName)
        .deleteMany({})
        .then(async () => {
            await db.collection(collectionName).insertOne({ budget: newBudget }).catch(captureException)
            state.budget = newBudget
        })
        .catch(captureException)
}

function getMyDailyBudget() {
    return state.budget.toFixed(2)
}

function addTransaction({ money, description, newBudget }) {
    DbInstance()
        .collection(collectionName)
        .deleteMany({})
        .then(async () => {
            await DbInstance().collection(collectionName).insertOne({ budget: newBudget }).catch(captureException)
            await DbInstance().collection(collectionTransactionName).insertOne({
                date: new Date(),
                money,
                description
            }).catch(captureException)
        }).catch(captureException)
}

async function spentMoney({ money, description }) {
    const newBudget = state.budget - money
    state.budget = newBudget
    state.transactions.push({ money, description })
    setTimeout(() => addTransaction({ money, description, newBudget }), 1000)
    return newBudget
}

module.exports = {
    spentMoney,
    getMyDailyBudget,
    dailyHandles,
    fillDaylyBudgetState: fillState
}