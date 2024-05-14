const captureException = require('../observability/Sentry')
const { DbInstance } = require('../repository/mongodb')
const { enviarMensagemParaMim } = require('../telegram')

const state = {
    budget: null,
    transactions: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const FECHAMENTO_COMPETENCIA_COLLECTION = 'fechamento_competencia'
const dailyBudgetGain = 300
const weekendBudgetGain = 500

async function consultarTransacoesDoDia(dataProcurada) {
    const db = DbInstance()

    const data = await db
        .collection(FECHAMENTO_COMPETENCIA_COLLECTION)
        .find({
            periodoInicial: { $lte: dataProcurada },
            periodoFinal: { $gte: dataProcurada }
        })
        .toArray()

    return data[0].transactions
        .filter(it => {
            const transactionDate = new Date(it.date);

            return transactionDate.getDate() === dataProcurada.getDate() &&
                transactionDate.getMonth() === dataProcurada.getMonth() &&
                transactionDate.getFullYear() === dataProcurada.getFullYear()
        })
        .map(it => `R$ ${it.money} -- ${it.description}`)
}

async function gerarRelatorioFechamentoCompentencia() {
    const db = DbInstance()

    const data = await db
        .collection(FECHAMENTO_COMPETENCIA_COLLECTION)
        .find({})
        .toArray()

    if (data.length == 0) {
        return []
    }

    function getFormatedDateString(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    }

    let valueReturned = []
    data.forEach(it => {
        const transactions = it.transactions.map(transacation => Number(transacation.money))
        const total = transactions.reduce((sum, value) => sum + value, 0)
        const periodo = `de ${getFormatedDateString(it.periodoInicial)} ate ${getFormatedDateString(it.periodoFinal)}`
        const totalTransactions = transactions.length
        const maiorTransacation = it.transactions.map(transacation => ({
            money: Number(transacation.money),
            description: transacation.description,
        })).sort((a, b) => b.money - a.money)[0]

        valueReturned.push(`
            Periodo: ${periodo}
            Total de Transacoes: ${totalTransactions}
            Total: R$${total.toFixed(2)}
            Media diaria: R$${(total / 30).toFixed(2)}
            Maior Transacao: R$${maiorTransacation.money.toFixed(2)} - ${maiorTransacation.description}
        `)
    })

    return valueReturned
}

async function fillState() {
    try {
        const coll = DbInstance()
            .collection(collectionName)

        const data = await coll
            .find({})
            .limit(1)
            .sort({ _id: -1 })
            .toArray()

        if (data.length == 0) {
            state.budget = 50
        } else {
            state.budget = data[0].budget
        }

        console.log(collectionName, 'filled', 'new balance:', state.budget.toFixed(2))
    } catch (error) {
        captureException(error)
        throw new Error('Cannot load daily budget')
    }
}

function addNewBalance(newBalance, justify = "") {
    const db = DbInstance()
    db.collection(collectionName)
        .insertOne({ budget: newBalance, date: new Date(), justify })
        .catch(captureException)

    state.budget = newBalance
}

function hojeEhFimDeSemana() {
    const dataAtual = new Date();
    const diaDaSemana = dataAtual.getDay();

    return diaDaSemana === 6 || diaDaSemana === 0;
}

function sendMessage(message) {
    enviarMensagemParaMim(message)
}

function displayTransactionsToday() {
    if (state.transactions.length > 0) {
        const total = state.transactions
            .map(it => it.money)
            .reduce((sum, value) => sum + value, 0)

        if (total > 0) {
            const message = `Hoje voce gastou R$${Number(total).toFixed(2)}`
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

    db.collection(FECHAMENTO_COMPETENCIA_COLLECTION).insertOne({
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

            let diasAteHoje = calcularDiasAteHoje(ultimoElemento.date)
            if (diasAteHoje == 0)
                diasAteHoje = 1


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

    addNewBalance(newBudget)
}

function getMyDailyBudget() {
    return state.budget.toFixed(2)
}

function addTransaction({ money, description, newBudget }) {
    addNewBalance(newBudget)
    DbInstance().collection(collectionTransactionName)
        .insertOne({
            date: new Date(),
            money,
            description
        }).catch(captureException)
}

async function spentMoney({ money, description }) {
    money = Number(money)
    console.log('spent money', money)
    if (isNaN(money)) {
        return
    }

    const newBudget = state.budget - money
    state.transactions.push({ money, description })
    setTimeout(() => addTransaction({ money, description, newBudget }), 1000)
    return newBudget
}

function addMoneyToDailyBudget(money) {
    money = Number(money)
    console.log('add Money To Daily Budget', money)
    if (isNaN(money)) {
        return
    }

    const newBudget = state.budget + money
    addNewBalance(newBudget, "add by func addMoneyToDailyBudget")
    return newBudget
}

module.exports = {
    spentMoney,
    getMyDailyBudget,
    dailyHandles,
    fillDaylyBudgetState: fillState,
    addMoneyToDailyBudget,
    gerarRelatorioFechamentoCompentencia,
    consultarTransacoesDoDia
}
