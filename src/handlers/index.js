const addDividaHandler = require('./agiotagem/adicionar-divida')
const cobrarDividaHandler = require('./agiotagem/cobrar-dividas')
const pagarDividaHandler = require('./agiotagem/pagar-divida')
const registrarAcaoHandler = require('./b3/registrar-acao')
const listarCotacaoHandler = require('./b3/listar-cotacoes')
const helpHandler = require('./help/help')
const recordHandler = require('./record/record-audio')
const uploadRecords = require('./record/upload-records')
const changeIaMode = require('./ia/turn-ia-mode')
const jogoBixoHandler = require('./jogo-bixo/command-handler')
const estatisticasJogoBixoHandler = require('./jogo-bixo/estatisticas')

module.exports = {
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  registrarAcaoHandler,
  listarCotacaoHandler,
  helpHandler,
  recordHandler,
  uploadRecords,
  changeIaMode,
  jogoBixoHandler,
  estatisticasJogoBixoHandler
}
