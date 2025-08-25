const ultimoEmprestimoInfoHandler = require('./agiotagem/ultimo-emprestimo-info')
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
const addDailyBudgetHandler = require('./agiotagem/add-daily-budget')
const relatorioMensalDeGastosHandler = require('./agiotagem/relatorio-daily-budget')
const buscarGastoNoDiaHandler = require('./agiotagem/pesquisar-gastos-do-dia')
const assinaturasHandler = require('./assinaturas')
const realTimeConversaGpt = require('./real-time-conversa')
const airDropHandler = require('./web3/airdrop')
const updateGastosCartaoHandler = require('./agiotagem/update-gastos-cartao')
const arbitragemHandler = require('./b3/arbitragem')
const changeAutoArbitragemHandler = require('./b3/change-auto-arbitragem')
const assinaturasAtivasHandler = require('./assinaturas/assinaturas-ativas')
const restartHandler = require('./restart')

module.exports = {
  addDailyBudgetHandler,
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
  imgur,
  relatorioMensalDeGastosHandler,
  buscarGastoNoDiaHandler,
  assinaturasHandler,
  realTimeConversaGpt,
  airDropHandler,
  updateGastosCartaoHandler,
  ultimoEmprestimoInfoHandler,
  arbitragemHandler,
  changeAutoArbitragemHandler,
  assinaturasAtivasHandler,
  restartHandler
}
