import { contextInstance } from '../../context'
import captureException from '../../observability/Sentry'
import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { formatDate } from '../../shared/utils/discord-nicks-default'
import { sleep, nowInSaoPaulo } from '../../shared/utils/utils'
import { sendEmail } from '../email/EmailService'
import { adicionarGasto, LIMIT } from './GastosCartaoService'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('DailyBudgetService')

function getOrganizzeService() {
    return require('../finance/OrganizzeService').default ?? require('../finance/OrganizzeService')
}

function getTransactionCategorizationService() {
    return require('../finance/TransactionCategorizationService')
}

function getGeraPDF() {
    const m = require('../pdf/PdfService') as typeof import('../pdf/PdfService')
    return m.criarPDFRetornarCaminho
}

function getUpload() {
    const m = require('../upload/UploadService') as typeof import('../upload/UploadService')
    return m.upload
}

const state: {
    budget: number | null
    transactions: Array<{ money: number; description: string }>
    categories: Array<{ id: string; name: string }>
} = {
    budget: null,
    transactions: [],
    categories: []
}

const collectionName = 'my_daily_budget'
const collectionTransactionName = 'transactions_per_day'
const FECHAMENTO_COMPETENCIA_COLLECTION = 'fechamento_competencia'
const dailyBudgetGain = 162
const weekendBudgetGain = 655

async function fillCategoriesIfNecessary(): Promise<void> {
    if (state.categories.length === 0) {
        const organizzeService = getOrganizzeService()
        const categories = await organizzeService.getExpensesCategories()
        state.categories = categories
    }
}

async function categorizar(transactionData: { description: string }): Promise<any> {
    await fillCategoriesIfNecessary()
    const descriptionCategories = state.categories.map(category => category.name)
    const { categorizarTransacao } = getTransactionCategorizationService()
    const result = await categorizarTransacao(descriptionCategories, transactionData.description)
    log.debug({ result }, 'result categorizar')
    return result
}

async function createTransaction(
    transactionData: { description: string; money: number },
    categorieDescription: string
): Promise<void> {
    const categorieId = state.categories.find(
        category => category.name === categorieDescription
    )?.id
    const amountCents = transactionData.money * 100
    const organizzeService = getOrganizzeService()
    await organizzeService.createTransaction({
        description: transactionData.description.trim(),
        notes: 'Criado pelo bot',
        category_id: categorieId,
        amount_cents: amountCents
    })
}

async function categorizarTodos(
    dados: Array<{ description: string; money: number; date?: Date }>
): Promise<any[]> {
    const dadosCategorizados = await Promise.all(
        dados.map(async transactionData => {
            const categorieDescription = await categorizar(transactionData)
            await createTransaction(transactionData, categorieDescription.categoria)
            return { ...transactionData, categorieDescription }
        })
    )
    return dadosCategorizados
}

export async function gerarReportDosGastosDoUltimoFinalDeSemana(): Promise<void> {
    const dados = await gastosDoUltimoFimDeSemana()
    const dadosCategorizados = await categorizarTodos(dados)

    const itemsParaImprimir = dadosCategorizados.map(
        item =>
            `${formatDate(item.date)} R$ ${item.money} -- ${item.description} -- ${item.categorieDescription.categoria}`
    )
    itemsParaImprimir.push(
        `Total: R$${dados
            .map(it => it.money)
            .reduce((sum, value) => sum + value, 0)
            .toFixed(2)}`
    )

    const criarPDF = getGeraPDF()
    const caminho = criarPDF(itemsParaImprimir, 'Relatorio de gastos do ultimo final de semana')

    await sleep(1000)
    const upload = getUpload()
    const uploaded = await upload(caminho)
    if (uploaded) {
        const email = {
            to: 'jeanlucafp@gmail.com',
            subject: 'Gastos do final de semana',
            body: 'Segue em anexo ',
            attachmentLink: uploaded
        }

        sendEmail(email)
    }
}

async function searchTransactions(filter: Record<string, any> = {}): Promise<any[]> {
    const coll = MongoConnection.getCollection(collectionTransactionName)
    return coll.find(filter as never).toArray()
}

async function gastosDoUltimoFimDeSemana(): Promise<any[]> {
    const sextaFeira = new Date()
    sextaFeira.setDate(sextaFeira.getDate() - 3)

    const sabado = new Date()
    sabado.setDate(sabado.getDate() - 2)

    const domingo = new Date()
    domingo.setDate(domingo.getDate() - 1)

    const sextaFeiraData = await searchTransactions({
        date: {
            $gte: new Date(sextaFeira.setHours(0, 0, 0, 0)),
            $lte: new Date(sextaFeira.setHours(23, 59, 59, 999))
        }
    })

    const sextaFeiraDataFilter = sextaFeiraData.filter(item => {
        const transactionDate = new Date(item.date)
        return transactionDate.getHours() >= 18
    })

    const sabadoData = await searchTransactions({
        date: {
            $gte: new Date(sabado.setHours(0, 0, 0, 0)),
            $lte: new Date(sabado.setHours(23, 59, 59, 999))
        }
    })

    const domingoData = await searchTransactions({
        date: {
            $gte: new Date(domingo.setHours(0, 0, 0, 0)),
            $lte: new Date(domingo.setHours(23, 59, 59, 999))
        }
    })

    return [...sextaFeiraDataFilter, ...sabadoData, ...domingoData]
}

async function consultarTransacoesDoDiaForaDaCompetencia(
    dataProcurada: Date
): Promise<string[]> {
    const data = await searchTransactions({
        date: { $gte: dataProcurada, $lte: dataProcurada }
    })

    return data
        .filter(it => {
            const transactionDate = new Date(it.date)
            return (
                transactionDate.getDate() === dataProcurada.getDate() &&
                transactionDate.getMonth() === dataProcurada.getMonth() &&
                transactionDate.getFullYear() === dataProcurada.getFullYear()
            )
        })
        .map(it => `${formatDate(it.date)} R$ ${it.money} -- ${it.description}`)
}

export async function consultarTransacoesDoDia(dataProcurada: Date): Promise<string[]> {
    const coll = MongoConnection.getCollection(FECHAMENTO_COMPETENCIA_COLLECTION)
    const data = await coll
        .find({
            periodoInicial: { $lte: dataProcurada },
            periodoFinal: { $gte: dataProcurada }
        } as never)
        .toArray()

    if (data.length === 0) {
        return consultarTransacoesDoDiaForaDaCompetencia(dataProcurada)
    }

    return (data[0] as any).transactions
        .filter((it: any) => {
            const transactionDate = new Date(it.date)
            return (
                transactionDate.getDate() === dataProcurada.getDate() &&
                transactionDate.getMonth() === dataProcurada.getMonth() &&
                transactionDate.getFullYear() === dataProcurada.getFullYear()
            )
        })
        .map((it: any) => `${formatDate(it.date)} R$ ${it.money} -- ${it.description}`)
}

export async function gerarRelatorioFechamentoCompentencia(): Promise<string[]> {
    const coll = MongoConnection.getCollection(FECHAMENTO_COMPETENCIA_COLLECTION)
    const data = await coll.find({} as never).toArray()

    if (data.length === 0) {
        return []
    }

    const valueReturned: string[] = []
    data.forEach((it: any) => {
        const transactions = it.transactions.map((t: any) => Number(t.money))
        const total = transactions.reduce((sum: number, value: number) => sum + value, 0)
        const periodo = `de ${formatDate(it.periodoInicial)} ate ${formatDate(it.periodoFinal)}`
        const totalTransactions = transactions.length
        const maiorTransacation = it.transactions
            .map((t: any) => ({ money: Number(t.money), description: t.description }))
            .sort((a: any, b: any) => b.money - a.money)[0]

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

export async function fillDaylyBudgetState(): Promise<void> {
    try {
        const coll = MongoConnection.getCollection(collectionName)
        const data = await coll.find({} as never).limit(1).sort({ _id: -1 }).toArray()

        if (data.length === 0) {
            state.budget = 50
        } else {
            state.budget = (data[0] as any).budget
        }

        log.info({ collection: collectionName, balance: state.budget!.toFixed(2) }, 'Daily budget carregado')
    } catch (error) {
        captureException(error)
        throw new Error('Cannot load daily budget')
    }
}

function addNewBalance(newBalance: number, justify = ''): void {
    const coll = MongoConnection.getCollection(collectionName)
    coll.insertOne({ budget: newBalance, date: new Date(), justify } as never).catch(
        captureException
    )

    state.budget = newBalance
}

function hojeEhFimDeSemana(): boolean {
    const dataAtual = new Date()
    const diaDaSemana = dataAtual.getDay()
    return diaDaSemana === 6 || diaDaSemana === 0
}

function sendMessage(message: string): void {
    contextInstance().emitEvent('enviar-mensagem-telegram', message)
}

function displayTransactionsToday(): void {
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

function fecharCompetencia(ultimaData: Date, dados: any[], coll: any): void {
    const transactions = dados.map(item => ({
        date: item.date,
        money: item.money,
        description: item.description
    }))

    MongoConnection.getCollection(FECHAMENTO_COMPETENCIA_COLLECTION)
        .insertOne({
            periodoInicial: ultimaData,
            periodoFinal: new Date(),
            transactions
        } as never)
        .then(() => {
            MongoConnection.getCollection(collectionTransactionName).deleteMany({} as never)
        })
}

function hojeEhSextaFeira(): boolean {
    return new Date().getDay() === 5
}

function calcularNovoBudget(): number {
    return hojeEhFimDeSemana()
        ? state.budget! + weekendBudgetGain
        : state.budget! + dailyBudgetGain
}

function calcularDiasAteHoje(data: Date): number {
    const umDiaMs = 24 * 60 * 60 * 1000
    const dias = Math.floor((new Date().getTime() - data.getTime()) / umDiaMs)
    return dias === 0 ? 1 : dias
}

function processarHistoricoTransacoes(result: any[]): void {
    if (result.length === 0) return

    log.info({ collection: collectionTransactionName, count: result.length }, 'Transacoes encontradas')
    const ultimoElemento = result[0]
    const diasAteHoje = calcularDiasAteHoje(ultimoElemento.date)
    const totalDespesas = result.map(it => Number(it.money)).reduce((sum, v) => sum + v, 0)
    const media = totalDespesas / diasAteHoje
    sendMessage(`Nos ultimos ${diasAteHoje} dias voce gastou em media R$${media.toFixed(2)} por dia`)

    if (diasAteHoje > 30) {
        fecharCompetencia(ultimoElemento.date, result, null)
    }
}

function filtrarTransacoesDaSemana(transacoes: any[]): any[] {
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

function enviarResumoSemanalCartao(transacoes: any[]): void {
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

export function dailyHandles(): void {
    const newBudget = calcularNovoBudget()

    displayTransactionsToday()

    searchTransactions().then(result => {
        processarHistoricoTransacoes(result)
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

export function getMyDailyBudget(): string {
    if (state.budget === null) {
        return 'N/A (state not loaded yet)'
    }
    return state.budget.toFixed(2)
}

function bulkAddTransaction(newBudget: number, items: Array<{ money: number; description: string }>): void {
    addNewBalance(newBudget)
    const coll = MongoConnection.getCollection(collectionTransactionName)
    coll
        .insertMany(
            items.map(i => ({
                date: nowInSaoPaulo(),
                money: i.money,
                description: i.description
            })) as never[]
        )
        .catch(captureException)
}

function addTransaction({
    money,
    description,
    newBudget
}: {
    money: number
    description: string
    newBudget: number
}): void {
    addNewBalance(newBudget)
    const coll = MongoConnection.getCollection(collectionTransactionName)
    coll
        .insertOne({ date: nowInSaoPaulo(), money, description } as never)
        .catch(captureException)
}

export async function spentMoney({
    money,
    description
}: {
    money: number | string
    description: string
}): Promise<number | undefined> {
    money = Number(money)
    log.debug({ money }, 'spent money')
    if (isNaN(money)) {
        return
    }

    const newBudget = state.budget! - money
    state.transactions.push({ money, description })
    setTimeout(() => addTransaction({ money: money as number, description, newBudget }), 1000)

    adicionarGasto(money as number)

    return newBudget
}

export function addMoneyToDailyBudget(money: number | string): number | undefined {
    money = Number(money)
    log.debug({ money }, 'add Money To Daily Budget')
    if (isNaN(money)) {
        return
    }

    const newBudget = state.budget! + money
    addNewBalance(newBudget, 'add by func addMoneyToDailyBudget')
    return newBudget
}

export function batchInsert(
    batchItens: Array<{ money: number | string; description: string }>
): number {
    const itemsMapped = batchItens
        .filter(i => {
            const money = Number(i.money)
            return !isNaN(money)
        })
        .map(i => ({
            money: Number(i.money),
            description: i.description
        }))

    itemsMapped.forEach(({ money, description }) =>
        state.transactions.push({ money, description })
    )
    const total = itemsMapped
        .map(i => i.money)
        .reduce((sum, value) => sum + value, 0)
    const newBudget = state.budget! - total
    bulkAddTransaction(newBudget, itemsMapped)
    adicionarGasto(total)
    return newBudget
}
