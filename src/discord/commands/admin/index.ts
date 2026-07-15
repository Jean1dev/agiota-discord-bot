import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { RestartCommand } from './RestartCommand'
import { MeConecteiCommand } from './MeConecteiCommand'
import { UpdateInterestCommand } from './UpdateInterestCommand'
import { FoodSpendingCommand } from './FoodSpendingCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const restartCommand = adminGuard.protect(new RestartCommand())
const meConecteiCommand = adminGuard.protect(new MeConecteiCommand())
const updateInterestCommand = adminGuard.protect(new UpdateInterestCommand())
const foodSpendingCommand = adminGuard.protect(new FoodSpendingCommand())

export const restartHandler = restartCommand.asNoArgsHandler()
export const meconecteiHandler = meConecteiCommand.asHandler()
export const updateInterestHandler = updateInterestCommand.asNoArgsHandler()
export const foodSpendingHandler = foodSpendingCommand.asNoArgsHandler()
