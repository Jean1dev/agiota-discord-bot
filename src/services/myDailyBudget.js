const { contextInstance } = require('../context')
const captureException = require('../observability/Sentry')
const { DbInstance } = require('../repository/mongodb')
const { formatDate } = require('../utils/discord-nicks-default')
const { sleep } = require('../utils/utils')
const sendEmail = require('./EmailService')
const criarPDFRetornarCaminho = require('./GerarPDF')
const upload = require('./UploadService')

const state = {
    budget: null,
    transactions: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const FECHAMENTO_COMPETENCIA_COLLECTION = 'fechamento_competencia'
const dailyBudgetGain = 152
const weekendBudgetGain = 655

async function gerarReportDosGastosDoUltimoFinalDeSemana() {
    const dados = await gastosDoUltimoFimDeSemana()
    const itemsParaImprimir = dados.map(item => `${formatDate(item.date)} R$ ${item.money} -- ${item.description}`)
    itemsParaImprimir.push(`Total: R$${dados.map(it => it.money).reduce((sum, value) => sum + value, 0).toFixed(2)}`)
    const caminho = criarPDFRetornarCaminho(itemsParaImprimir, 'Relatorio de gastos do ultimo final de semana')
    await sleep(1000)
    const uploaded = await upload(caminho)
    if (uploaded) {
        const email = {
            to: 'jeanlucafp@gmail.com',
            subject: 'Gastos do final de semana',
            message: 'Segue em anexo ',
            attachmentLink: uploaded
        }

        sendEmail(email)
    }
}

async function searchTransactions(filter = {}) {
    const db = DbInstance()
    const result = await db
        .collection(collectionTransactionName)
        .find(filter)
        .toArray()

    return result
}

async function gastosDoUltimoFimDeSemana() {
    function getUltimoFimDeSemana() {
        const hoje = new Date();
        const diaDaSemana = hoje.getDay();
        const sextaFeira = new Date(hoje);
        sextaFeira.setDate(hoje.getDate() - diaDaSemana + 5);
        const sabado = new Date(sextaFeira);
        sabado.setDate(sextaFeira.getDate() + 1);
        const domingo = new Date(sabado);
        domingo.setDate(sabado.getDate() + 1);

        return { sextaFeira, sabado, domingo };
    }

    const { sextaFeira, sabado, domingo } = getUltimoFimDeSemana();

    const sextaFeiraData = await searchTransactions({
        date: { $lte: sextaFeira },
        date: { $gte: sextaFeira }
    })

    const sextaFeiraDataFilter = sextaFeiraData.filter(item => {
        const transactionDate = new Date(item.date);
        return transactionDate.getHours() >= 18;
    })

    const sabadoData = await searchTransactions({
        date: { $lte: sabado },
        date: { $gte: sabado }
    })

    const domingoData = await searchTransactions({
        date: { $lte: domingo },
        date: { $gte: domingo }
    })

    return [...sextaFeiraDataFilter, ...sabadoData, ...domingoData];
}

async function consultarTransacoesDoDiaForaDaCompetencia(dataProcurada) {
    const db = DbInstance()

    const data = await searchTransactions({
        date: { $lte: dataProcurada },
        date: { $gte: dataProcurada }
    })

    return data.map(it => `${formatDate(it.date)} R$ ${it.money} -- ${it.description}`)
}

async function consultarTransacoesDoDia(dataProcurada) {
    const db = DbInstance()

    const data = await db
        .collection(FECHAMENTO_COMPETENCIA_COLLECTION)
        .find({
            periodoInicial: { $lte: dataProcurada },
            periodoFinal: { $gte: dataProcurada }
        })
        .toArray()

    if (data.length == 0) {
        return consultarTransacoesDoDiaForaDaCompetencia(dataProcurada)
    }

    return data[0].transactions
        .filter(it => {
            const transactionDate = new Date(it.date);

            return transactionDate.getDate() === dataProcurada.getDate() &&
                transactionDate.getMonth() === dataProcurada.getMonth() &&
                transactionDate.getFullYear() === dataProcurada.getFullYear()
        })
        .map(it => `${formatDate(it.date)} R$ ${it.money} -- ${it.description}`)
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

    let valueReturned = []
    data.forEach(it => {
        const transactions = it.transactions.map(transacation => Number(transacation.money))
        const total = transactions.reduce((sum, value) => sum + value, 0)
        const periodo = `de ${formatDate(it.periodoInicial)} ate ${formatDate(it.periodoFinal)}`
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
    contextInstance().emitEvent('enviar-mensagem-telegram', message)
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

    searchTransactions()
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
    consultarTransacoesDoDia,
    gerarReportDosGastosDoUltimoFinalDeSemana
}
