const gritariaHandler = require('./agiotagem/gritaria')
const addDividaHandler = require('./agiotagem/adicionar-divida')
const cobrarDividaHandler = require('./agiotagem/cobrar-dividas')
const pagarDividaHandler = require('./agiotagem/pagar-divida')
const registrarAcaoHandler = require('./b3/registrar-acao')
const listarCotacaoHandler = require('./b3/listar-cotacoes')

module.exports = {
  gritariaHandler,
  addDividaHandler,
  cobrarDividaHandler,
  pagarDividaHandler,
  registrarAcaoHandler,
  listarCotacaoHandler
}
