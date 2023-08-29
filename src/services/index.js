const {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat
} = require('./analiseDadosUsuarios')
const listarAsUltimasFeatures = require('./githubOperations')
const criarPDFRetornarCaminho = require('./GerarPDF')
const eviarEmailComAnexo = require('./enviarEmailCobranca')
const { notificar: notificacaoCaixinha } = require('./CaixinhaService')
const financeServices = require('./FinanceServices')

module.exports = {
    listarAsUltimasFeatures,
    criarPDFRetornarCaminho,
    eviarEmailComAnexo,
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso,
    exibirRankingNoChat,
    notificacaoCaixinha,
    financeServices
}