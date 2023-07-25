const comandos = []
module.exports = comandos

const {
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
  estatisticasJogoBixoHandler,
  musicPlayerHanlder
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
registrarComando('acao', registrarAcaoHandler, 'Adiciona uma acao na lista das monitoradas :: args @nomePapel', true)
registrarComando('cotacao', listarCotacaoHandler, 'Lista a cotacao das acoes')
registrarComando('rec', recordHandler, 'grava audio por X tempo em segundos :: args @tempo', true)
registrarComando('uprec', uploadRecords, 'faz upload das gravações para o google drive')
registrarComando('ia', changeIaMode, 'liga ou desliga a inteligencia artifical')
registrarComando('bixo', jogoBixoHandler, 'aposta em um bixo no jogo do bixo :: args @numero', true)
registrarComando('bixo-data', estatisticasJogoBixoHandler, 'gera as estatisticas do bixo')
registrarComando('p', musicPlayerHanlder, 'toca uma musica do youtube ::@args url da musica', true)

