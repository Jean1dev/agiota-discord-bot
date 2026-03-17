const { contextInstance } = require('../context')
const captureException = require('../observability/Sentry')
const { DbInstance } = require('../repository/mongodb')
const { formatDate } = require('../utils/discord-nicks-default')
const { sleep, nowInSaoPaulo } = require('../utils/utils')
const sendEmail = require('./EmailService')
const criarPDFRetornarCaminho = require('./GerarPDF')
const upload = require('./UploadService')
const gastosCartao = require('./GastosCartaoService')
const organizzeService = require('./OrganizzeService')
const { categorizarTransacao } = require('./TransactionCategorizationService')

const state = {
    budget: null,
    transactions: [],
    categories: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const FECHAMENTO_COMPETENCIA_COLLECTION = 'fechamento_competencia'
const dailyBudgetGain = 162
const weekendBudgetGain = 655

async function fillCategoriesIfNecessary() {
    if (state.categories.length === 0) {
        const categories = await organizzeService.getExpensesCategories()
        state.categories = categories
    }
}

async function categorizar(transactionData) {
    await fillCategoriesIfNecessary()
    const descriptionCategories = state.categories.map(category => category.name)
    const result = await categorizarTransacao(descriptionCategories, transactionData.description)
    console.log('result categorizar', result)
    return result
}

async function createTransaction(transactionData, categorieDescription) {
    const categorieId = state.categories.find(category => category.name === categorieDescription).id
    const amountCents = transactionData.money * 100
    await organizzeService.createTransaction({
        description: transactionData.description.trim(),
        notes: "Criado pelo bot",
        category_id: categorieId,
        amount_cents: amountCents
    })
}

async function categorizarTodos(dados) {
    const dadosCategorizados = await Promise.all(dados.map(async (transactionData) => {
        const categorieDescription = await categorizar(transactionData)
        await createTransaction(transactionData, categorieDescription.categoria)
        return { ...transactionData, categorieDescription }
    }))
    return dadosCategorizados
}

async function gerarReportDosGastosDoUltimoFinalDeSemana() {
    const dados = await gastosDoUltimoFimDeSemana()
    const dadosCategorizados = await categorizarTodos(dados)

    const itemsParaImprimir = dadosCategorizados.map(item => 
        `${formatDate(item.date)} R$ ${item.money} -- ${item.description} -- ${item.categorieDescription.categoria}`)
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
    const sextaFeira = new Date();
    sextaFeira.setDate(sextaFeira.getDate() - 3);

    const sabado = new Date();
    sabado.setDate(sabado.getDate() - 2);

    const domingo = new Date();
    domingo.setDate(domingo.getDate() - 1);

    const sextaFeiraData = await searchTransactions({
        date: {
            $gte: new Date(sextaFeira.setHours(0, 0, 0, 0)),
            $lte: new Date(sextaFeira.setHours(23, 59, 59, 999))
        }
    });

    const sextaFeiraDataFilter = sextaFeiraData.filter(item => {
        const transactionDate = new Date(item.date);
        return transactionDate.getHours() >= 18;
    })

    const sabadoData = await searchTransactions({
        date: {
            $gte: new Date(sabado.setHours(0, 0, 0, 0)),
            $lte: new Date(sabado.setHours(23, 59, 59, 999))
        }
    });

    const domingoData = await searchTransactions({
        date: {
            $gte: new Date(domingo.setHours(0, 0, 0, 0)),
            $lte: new Date(domingo.setHours(23, 59, 59, 999))
        }
    });

    return [...sextaFeiraDataFilter, ...sabadoData, ...domingoData];
}

async function consultarTransacoesDoDiaForaDaCompetencia(dataProcurada) {
    const data = await searchTransactions({
        date: { $lte: dataProcurada },
        date: { $gte: dataProcurada }
    })

    return data
        .filter(it => {
            const transactionDate = new Date(it.date);

            return transactionDate.getDate() === dataProcurada.getDate() &&
                transactionDate.getMonth() === dataProcurada.getMonth() &&
                transactionDate.getFullYear() === dataProcurada.getFullYear()
        })
        .map(it => `${formatDate(it.date)} R$ ${it.money} -- ${it.description}`)
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

function hojeEhSextaFeira() {
    return new Date().getDay() === 5
}

function calcularNovoBudget() {
    return hojeEhFimDeSemana()
        ? state.budget + weekendBudgetGain
        : state.budget + dailyBudgetGain
}

function calcularDiasAteHoje(data) {
    const umDiaMs = 24 * 60 * 60 * 1000
    const dias = Math.floor((new Date() - data) / umDiaMs)
    return dias === 0 ? 1 : dias
}

function processarHistoricoTransacoes(result, db) {
    if (result.length === 0) return

    console.log(`${collectionTransactionName} quantidade `, result.length)
    const ultimoElemento = result[0]
    const diasAteHoje = calcularDiasAteHoje(ultimoElemento.date)
    const totalDespesas = result.map(it => Number(it.money)).reduce((sum, v) => sum + v, 0)
    const media = totalDespesas / diasAteHoje
    sendMessage(`Nos ultimos ${diasAteHoje} dias voce gastou em media R$${media.toFixed(2)} por dia`)

    if (diasAteHoje > 30) {
        fecharCompetencia(ultimoElemento.date, result, db)
    }
}

function filtrarTransacoesDaSemana(transacoes) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(monday.getDate() - daysToMonday)
    monday.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)
    return transacoes.filter(it => {
        const d = new Date(it.date)
        return d >= monday && d <= todayEnd
    })
}

function enviarResumoSemanalCartao(transacoes) {
    const LIMIT = gastosCartao.LIMIT
    const totalGastoCartao = contextInstance().totalGastoCartao
    const restante = Math.max(0, LIMIT - totalGastoCartao)
    const transacoesSemana = filtrarTransacoesDaSemana(transacoes)
    const totalSemana = transacoesSemana
        .map(it => Number(it.money))
        .reduce((sum, value) => sum + value, 0)
    const msg = [
        'Resumo sexta-feira (segunda até hoje):',
        `Total gasto na semana: R$ ${totalSemana.toFixed(2)}`,
        `Total gasto no cartão: R$ ${Number(totalGastoCartao).toFixed(2)}`,
        `Limite do cartão: R$ ${LIMIT.toFixed(2)}`,
        `Faltam R$ ${restante.toFixed(2)} para atingir o limite.`
    ].join('\n')
    sendMessage(msg)
}

function dailyHandles() {
    const newBudget = calcularNovoBudget()
    const db = DbInstance()

    displayTransactionsToday()

    searchTransactions().then(result => {
        processarHistoricoTransacoes(result, db)
        if (hojeEhSextaFeira()) {
            try {
                enviarResumoSemanalCartao(result)
            } catch (err) {
                captureException(err)
            }
        }
    })

    addNewBalance(newBudget)
}

function getMyDailyBudget() {
    return state.budget.toFixed(2)
}

function bulkAddTransaction(newBudget, items) {
    addNewBalance(newBudget)
    DbInstance().collection(collectionTransactionName)
        .insertMany(items.map(i => ({
            date: nowInSaoPaulo(),
            money: i.money,
            description: i.description
        })))
        .catch(captureException)
}

function addTransaction({ money, description, newBudget }) {
    addNewBalance(newBudget)
    DbInstance().collection(collectionTransactionName)
        .insertOne({
            date: nowInSaoPaulo(),
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

    gastosCartao.adicionarGasto(money)

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

function batchInsert(batchItens) {
    const itemsMapped = batchItens.filter(i => {
        const money = Number(i.money)
        if (isNaN(money))
            return false

        return true
    }).map(i => ({
        money: Number(i.money),
        description: i.description
    }))

    itemsMapped.forEach(({ money, description }) => state.transactions.push({ money, description }))
    const total = itemsMapped.map(i => i.money).reduce((sum, value) => sum + value, 0)
    const newBudget = state.budget - total
    bulkAddTransaction(newBudget, itemsMapped)
    gastosCartao.adicionarGasto(total)
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
    gerarReportDosGastosDoUltimoFinalDeSemana,
    batchInsert
}
