import { MongoDebtRepository } from '../../../infrastructure/database/MongoDebtRepository'
import { AddDebtUseCase } from '../../../application/debt/AddDebtUseCase'
import { PayDebtUseCase } from '../../../application/debt/PayDebtUseCase'
import { ListDebtsUseCase } from '../../../application/debt/ListDebtsUseCase'
import { AddDebtCommand } from './AddDebtCommand'
import { PayDebtCommand } from './PayDebtCommand'
import { ChargeDebtsCommand } from './ChargeDebtsCommand'

const repo = new MongoDebtRepository()

const addDebtCommand = new AddDebtCommand(new AddDebtUseCase(repo))
const payDebtCommand = new PayDebtCommand(new PayDebtUseCase(repo))
const chargeDebtsCommand = new ChargeDebtsCommand(new ListDebtsUseCase(repo))

export const addDividaHandler = addDebtCommand.asHandler()
export const pagarDividaHandler = payDebtCommand.asHandler()
export const cobrarDividaHandler = chargeDebtsCommand.asNoArgsHandler()
