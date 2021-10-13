const gritariaHandler = require('./gritaria')
const addDividaHandler = require('./adicionar-divida')
const cobrarDividaHandler = require('./cobrar-dividas')
const pagarDividaHandler = require('./pagar-divida')

module.exports = {
  gritariaHandler,
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler
}
