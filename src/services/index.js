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
const { processAMQPMessage : cryptoServiceProcessMessage} = require('./cryptoArbitrageService')
const myDailyBudgetService = require('./myDailyBudget')
const { broadcastDiscord } = require('./broadcast-discord')
const UploadService = require('./UploadService')
const runQuizTask = require('./quiz')

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
    broadcastDiscord,
    UploadService,
    runQuizTask
}