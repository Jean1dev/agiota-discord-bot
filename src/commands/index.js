const {
  gritariaHandler,
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  registrarAcaoHandler,
  listarCotacaoHandler,
  helpHandler
} = require('../handlers')

async function handleAgtCommand(args, message) {

  if (args[0] === 'help') {
    return helpHandler(message)
  }

  if (args[0] === 'gritaria') {
    return gritariaHandler(message)
  }

  if (args[0] === 'add-divida') {
    return addDividaHandler(args, message)
  }

  if (args[0] === 'cobrar') {
    return cobrarDividaHandler(message)
  }

  if (args[0] === 'pagar') {
    return pagarDividaHandler(args, message)
  }

  if (args[0] === 'acao') {
    return registrarAcaoHandler(args, message)
  }

  if(args[0] === 'cotacao') {
    return listarCotacaoHandler(message)
  }
}

module.exports = async (command, args, message) => {
  if (command === '$') {
    return handleAgtCommand(args, message)
  }
}
