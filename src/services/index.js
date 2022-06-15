const {
    registrarEntradaTexto,
    getRegistros,
    clearRegistros
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
    clearRegistros
}