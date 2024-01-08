const comandos = []
module.exports = comandos

const {
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
  addDailyBudgetHandler
} = require('../handlers')

function registrarComando(comando, handler, descricao, needArgs = false) {
  comandos.push({
    comando,
    handler,
    descricao,
    needArgs
  })
}

registrarComando('help', helpHandler, 'lista os comandos disponiveis')
registrarComando('add-divida', addDividaHandler, 'Adicionar uma divida para um usuario :: args @valor @usuario @descricao', true)
registrarComando('cobrar', cobrarDividaHandler, 'Lista os usuarios que possuem debitos')
registrarComando('pagar', pagarDividaHandler, 'Paga a divida :: args @valorPago', true)
registrarComando('rec', recordHandler, 'grava audio por X tempo em segundos :: args @tempo', true)
registrarComando('uprec', uploadRecords, 'faz upload das gravações para o google drive')
registrarComando('ia', changeIaMode, 'liga ou desliga a inteligencia artifical')
registrarComando('bixo', jogoBixoHandler, 'aposta em um bixo no jogo do bixo :: args @numero', true)
registrarComando('bixo-data', estatisticasJogoBixoHandler, 'gera as estatisticas do bixo')
registrarComando('p', musicPlayerHanlder, 'Liga o player de musica')
registrarComando('acao', atualizarCotacaoHandler, 'atualizar cotacoes no app da carteira')
registrarComando('gpt', chatGpt, 'Tire suas dúvidas com o chatgpt', true)
registrarComando('imgur', imgur, 'Busca 5 imagens aleatorias do imgur')
registrarComando('budget', addDailyBudgetHandler, 'Adiciona um valor no orcamento diario de gastos', true)
