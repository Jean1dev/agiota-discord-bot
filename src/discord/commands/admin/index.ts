import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { RestartCommand } from './RestartCommand'
import { DbCleanCommand } from './DbCleanCommand'
import { MeConecteiCommand } from './MeConecteiCommand'
import { UpdateMonthlySpendingCommand } from './UpdateMonthlySpendingCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const restartCommand = adminGuard.protect(new RestartCommand())
const dbCleanCommand = adminGuard.protect(new DbCleanCommand())
const meConecteiCommand = adminGuard.protect(new MeConecteiCommand())
const updateMonthlySpendingCommand = adminGuard.protect(new UpdateMonthlySpendingCommand())

export const restartHandler = restartCommand.asNoArgsHandler()
export const dbCleanHandler = dbCleanCommand.asNoArgsHandler()
export const meconecteiHandler = meConecteiCommand.asHandler()
export const updateMonthlySpendingHandler = updateMonthlySpendingCommand.asNoArgsHandler()
