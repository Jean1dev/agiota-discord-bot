const {
  gritariaHandler,
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler
} = require('../handlers')

async function handleAgtCommand(args, message) {

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
}

module.exports = async (command, args, message) => {
  if (command === '$') {
    return handleAgtCommand(args, message)
  }
}
