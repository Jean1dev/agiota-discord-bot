const addDividaHandler = require('./agiotagem/adicionar-divida')
const cobrarDividaHandler = require('./agiotagem/cobrar-dividas')
const pagarDividaHandler = require('./agiotagem/pagar-divida')
const helpHandler = require('./help/help')
const recordHandler = require('./record/record-audio')
const uploadRecords = require('./record/upload-records')
const changeIaMode = require('./ia/turn-ia-mode')
const jogoBixoHandler = require('./jogo-bixo/command-handler')
const estatisticasJogoBixoHandler = require('./jogo-bixo/estatisticas')
const musicPlayerHanlder = require('./music')
const atualizarCotacaoHandler = require('./b3/atualizar-cotacao-carteira')
const { handleCommand: chatGpt } = require('./ia/chat-gpt')
const imgur = require("./imgur")

module.exports = {
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  helpHandler,
  recordHandler,
  uploadRecords,
  changeIaMode,
  jogoBixoHandler,
  estatisticasJogoBixoHandler,
  musicPlayerHanlder,
  atualizarCotacaoHandler,
  chatGpt,
  imgur
}
