const captureException = require('../observability/Sentry')
const { client, DATABASE } = require('../repository/mongodb')

const state = {
    budget: null,
    transactions: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const dailyBudgetGain = 50

function addBudget() {
    if (!state.budget) {
        getMyDailyBudget()
            .then(addBudget)

        return
    }
    const newBudget = state.budget + dailyBudgetGain
    client.connect().then(instance => {
        const db = instance.db(DATABASE)
        db
            .collection(collectionName)
            .deleteMany({})
            .then(async () => {
                await db.collection(collectionName).insertOne({ budget: newBudget }).catch(captureException)
                state.budget = newBudget
            })
            .catch(captureException)
            .finally(() => instance.close())
    })
}

function getMyDailyBudget() {
    if (state.budget) {
        return state.budget.toFixed(2)
    }

    return client.connect().then(instance => {
        return instance.db(DATABASE).collection(collectionName)
            .find({})
            .toArray()
            .then(arrayData => {
                if (arrayData.length == 0) {
                    state.budget = 50
                } else {
                    state.budget = arrayData[0].budget
                }

                instance.close()
                return state.budget
            }).catch(captureException)
    })
}

function addTransaction({ money, description, newBudget }) {
    client.connect().then(instance => {
        const db = instance.db(DATABASE)
        db
            .collection(collectionName)
            .deleteMany({})
            .then(async () => {
                await db.collection(collectionName).insertOne({ budget: newBudget }).catch(captureException)
                await db.collection(collectionTransactionName).insertOne({
                    date: new Date(),
                    money,
                    description
                }).catch(captureException)
                await instance.close()
            }).catch(captureException)
    })
}

async function spentMoney({ money, description }) {
    if (!state.budget) {
        await getMyDailyBudget()
    }

    const newBudget = state.budget - money
    state.budget = newBudget
    state.transactions.push({ money, description })
    setTimeout(() => addTransaction({ money, description, newBudget }), 1000)
    return newBudget
}

module.exports = {
    spentMoney,
    getMyDailyBudget,
    addBudget
}