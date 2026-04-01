const { AdminGuard } = require('../../guards/AdminGuard')
const { ConfigAuthorizationService } = require('../../guards/AuthorizationService')
const { RestartCommand } = require('./RestartCommand')
const { DbCleanCommand } = require('./DbCleanCommand')
const { MeConecteiCommand } = require('./MeConecteiCommand')

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const restartCommand = adminGuard.protect(new RestartCommand())
const dbCleanCommand = adminGuard.protect(new DbCleanCommand())
const meConecteiCommand = adminGuard.protect(new MeConecteiCommand())

module.exports = {
  restartHandler: restartCommand.asNoArgsHandler(),
  dbCleanHandler: dbCleanCommand.asNoArgsHandler(),
  meconecteiHandler: meConecteiCommand.asHandler(),
}
