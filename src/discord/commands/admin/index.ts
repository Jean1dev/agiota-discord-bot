import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { RestartCommand } from './RestartCommand'
import { DbCleanCommand } from './DbCleanCommand'
import { MeConecteiCommand } from './MeConecteiCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const restartCommand = adminGuard.protect(new RestartCommand())
const dbCleanCommand = adminGuard.protect(new DbCleanCommand())
const meConecteiCommand = adminGuard.protect(new MeConecteiCommand())

export const restartHandler = restartCommand.asNoArgsHandler()
export const dbCleanHandler = dbCleanCommand.asNoArgsHandler()
export const meconecteiHandler = meConecteiCommand.asHandler()
