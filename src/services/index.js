const {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso
} = require('./analiseDadosUsuarios')
const listarAsUltimasFeatures = require('./githubOperations')
const criarPDFRetornarCaminho = require('./GerarPDF')
const eviarEmailComAnexo = require('./enviarEmailCobranca')

module.exports = {
    listarAsUltimasFeatures,
    criarPDFRetornarCaminho,
    eviarEmailComAnexo,
    registrarEntradaTexto,
    getRegistros,
    clearRegistros,
    rankearUso
}