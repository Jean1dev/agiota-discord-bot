const {
  gritariaHandler,
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  registrarAcaoHandler,
  listarCotacaoHandler,
  helpHandler,
  reocordHandler
} = require('../handlers')
const { registrarComando, comandos } = require('./lista-comandos')

registrarComando('help', helpHandler, 'lista os comandos disponiveis')
registrarComando('gritaria', gritariaHandler, 'mamaco entra na sala e começa a gritar')
registrarComando('add-divida', addDividaHandler, 'Adicionar uma divida para um usuario :: args @valor @usuario @descricao', true)
registrarComando('cobrar', cobrarDividaHandler, 'Lista os usuarios que possuem debitos')
registrarComando('pagar', pagarDividaHandler, 'Paga a divida :: args @valorPago', true)
registrarComando('acao', registrarAcaoHandler, 'Adiciona uma acao na lista das monitoradas :: args @nomePapel', true)
registrarComando('cotacao', listarCotacaoHandler, 'Lista a cotacao das acoes')
registrarComando('record', reocordHandler, 'grava audio por X tempo :: args @tempo', true)

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
