const captureException = require('../observability/Sentry')
const { client, DATABASE } = require('../repository/mongodb')

const state = {
    budget: null,
    transactions: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const dailyBudgetGain = 55

async function fillState() {
    try {
        const db = await client.connect()
        const coll = db.db(DATABASE)
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
        await client.close()
    } catch (error) {
        captureException(error)
        throw new Error('Cannot load daily budget')
    }
}

function addBudget() {
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
    return state.budget.toFixed(2)
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
    const newBudget = state.budget - money
    state.budget = newBudget
    state.transactions.push({ money, description })
    setTimeout(() => addTransaction({ money, description, newBudget }), 1000)
    return newBudget
}

module.exports = {
    spentMoney,
    getMyDailyBudget,
    addBudget,
    fillDaylyBudgetState: fillState
}