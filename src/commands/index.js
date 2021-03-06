const {
  gritariaHandler,
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
} = require('../handlers')
const { registrarComando, comandos } = require('./lista-comandos')

registrarComando('help', helpHandler, 'lista os comandos disponiveis')
registrarComando('audio', gritariaHandler, 'mamaco entra na sala e lança um audio')
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

async function handleAgtCommand(args, message) {
  const command = args[0]
  const funcaoHandlerData = comandos.find(item => item.comando === command)
  if (!funcaoHandlerData) {
    return
  }

  const fnc = funcaoHandlerData.handler
  if (funcaoHandlerData.needArgs) {
    return fnc(args, message)
  }

  return fnc(message)
}

module.exports = async (command, args, message) => {
  if (command === '$') {
    return handleAgtCommand(args, message)
  }
}
