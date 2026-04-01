const { AdminGuard } = require('../../guards/AdminGuard')
const { ConfigAuthorizationService } = require('../../guards/AuthorizationService')
const { WhatsAppConfigCommand } = require('./WhatsAppConfigCommand')
const { WhatsAppClearCommand } = require('./WhatsAppClearCommand')
const { WhatsAppTestCommand } = require('./WhatsAppTestCommand')

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const zapConfigCommand = adminGuard.protect(new WhatsAppConfigCommand())
const zapClearCommand = adminGuard.protect(new WhatsAppClearCommand())
const zapTestCommand = adminGuard.protect(new WhatsAppTestCommand())

module.exports = {
  configWhatsAppHandler: zapConfigCommand.asNoArgsHandler(),
  clearWhatsAppHandler: zapClearCommand.asNoArgsHandler(),
  testWhatsAppHandler: zapTestCommand.asNoArgsHandler(),
}
