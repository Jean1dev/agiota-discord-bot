import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { RestartCommand } from './RestartCommand'
import { DbCleanCommand } from './DbCleanCommand'
import { MeConecteiCommand } from './MeConecteiCommand'
import { UpdateInterestCommand } from './UpdateInterestCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const restartCommand = adminGuard.protect(new RestartCommand())
const dbCleanCommand = adminGuard.protect(new DbCleanCommand())
const meConecteiCommand = adminGuard.protect(new MeConecteiCommand())
const updateInterestCommand = adminGuard.protect(new UpdateInterestCommand())

export const restartHandler = restartCommand.asNoArgsHandler()
export const dbCleanHandler = dbCleanCommand.asNoArgsHandler()
export const meconecteiHandler = meConecteiCommand.asHandler()
export const updateInterestHandler = updateInterestCommand.asNoArgsHandler()
