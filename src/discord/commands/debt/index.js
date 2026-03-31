/**
 * Ponto de composição dos commands de dívida.
 *
 * Instancia repositório → use cases → commands → exporta handlers
 * compatíveis com o sistema legado de registro (lista-comandos.js).
 *
 * Mantido em .js para ser importável pelo roteador JS existente sem
 * precisar compilar TypeScript. O ts-node não é necessário em produção.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MongoDebtRepository } = require('../../../infrastructure/database/MongoDebtRepository')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AddDebtUseCase } = require('../../../application/debt/AddDebtUseCase')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayDebtUseCase } = require('../../../application/debt/PayDebtUseCase')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ListDebtsUseCase } = require('../../../application/debt/ListDebtsUseCase')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AddDebtCommand } = require('./AddDebtCommand')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayDebtCommand } = require('./PayDebtCommand')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ChargeDebtsCommand } = require('./ChargeDebtsCommand')

const repo = new MongoDebtRepository()

const addDebtCommand = new AddDebtCommand(new AddDebtUseCase(repo))
const payDebtCommand = new PayDebtCommand(new PayDebtUseCase(repo))
const chargeDebtsCommand = new ChargeDebtsCommand(new ListDebtsUseCase(repo))

module.exports = {
  addDividaHandler: addDebtCommand.asHandler(),
  pagarDividaHandler: payDebtCommand.asHandler(),
  cobrarDividaHandler: chargeDebtsCommand.asNoArgsHandler(),
}
