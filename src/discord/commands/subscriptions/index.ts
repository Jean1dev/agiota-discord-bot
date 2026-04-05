import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { CreateSubscriptionCommand } from './CreateSubscriptionCommand'
import { ActiveSubscriptionsCommand } from './ActiveSubscriptionsCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const createSubCommand = adminGuard.protect(new CreateSubscriptionCommand())
const activeSubsCommand = adminGuard.protect(new ActiveSubscriptionsCommand())

export const assinaturasHandler = createSubCommand.asHandler()
export const assinaturasAtivasHandler = activeSubsCommand.asNoArgsHandler()
