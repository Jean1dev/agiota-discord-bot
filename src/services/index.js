const {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat
} = require('./analiseDadosUsuarios')
const listarAsUltimasFeatures = require('./githubOperations')
const criarPDFRetornarCaminho = require('./GerarPDF')
const { notificar: notificacaoCaixinha } = require('./CaixinhaService')
const financeServices = require('./FinanceServices')
const myDailyBudgetService = require('./myDailyBudget')
const { addMusic, ramdomMusic } = require('./MusicManagerService')

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
    ramdomMusic
}