const { AdminGuard } = require('../../guards/AdminGuard')
const { ConfigAuthorizationService } = require('../../guards/AuthorizationService')
const { CreateSubscriptionCommand } = require('./CreateSubscriptionCommand')
const { ActiveSubscriptionsCommand } = require('./ActiveSubscriptionsCommand')

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const createSubCommand = adminGuard.protect(new CreateSubscriptionCommand())
const activeSubsCommand = adminGuard.protect(new ActiveSubscriptionsCommand())

module.exports = {
  assinaturasHandler: createSubCommand.asHandler(),
  assinaturasAtivasHandler: activeSubsCommand.asNoArgsHandler(),
}
