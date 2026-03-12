const {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat,
    gerarRelatorioFechamentoCompentencia
} = require('./analiseDadosUsuarios')
const listarAsUltimasFeatures = require('./githubOperations')
const criarPDFRetornarCaminho = require('./GerarPDF')
const { notificar: notificacaoCaixinha } = require('./CaixinhaService')
const financeServices = require('./FinanceServices')
const { addMusic, ramdomMusic } = require('./MusicManagerService')
const { 
    processAMQPMessage: cryptoServiceProcessMessage, 
    forceArbitrage,
    rotinaDiariaCrypto,
    futureCrossingCounts
} = require('./cryptoArbitrageService')
const myDailyBudgetService = require('./myDailyBudget')
const { broadcastDiscord, sendToChannel } = require('./broadcast-discord')
const UploadService = require('./UploadService')
const runQuizTask = require('./quiz')
const gastosCartao = require('./GastosCartaoService')
const organizzeService = require('./OrganizzeService')
const transactionCategorizationService = require('./TransactionCategorizationService')
const { startAutoArbitrage } = require('./autoArbitrageService')
const youtubeRssService = require('./youtubeRssService')

module.exports = {
    listarAsUltimasFeatures,
    criarPDFRetornarCaminho,
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat,
    notificacaoCaixinha,
    financeServices,
    myDailyBudgetService,
    addMusic,
    ramdomMusic,
    gerarRelatorioFechamentoCompentencia,
    cryptoServiceProcessMessage,
    forceArbitrage,
    futureCrossingCounts,
    broadcastDiscord,
    sendToChannel,
    UploadService,
    runQuizTask,
    gastosCartao,
    organizzeService,
    transactionCategorizationService,
    rotinaDiariaCrypto,
    startAutoArbitrage,
    youtubeRssService
}