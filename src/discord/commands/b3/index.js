const { AdminGuard } = require('../../guards/AdminGuard')
const { ConfigAuthorizationService } = require('../../guards/AuthorizationService')
const { ArbitrageCommand } = require('./ArbitrageCommand')
const { ChangeAutoArbitrageCommand } = require('./ChangeAutoArbitrageCommand')
const { CrossingCountsCommand } = require('./CrossingCountsCommand')
const { UpdatePortfolioCommand } = require('./UpdatePortfolioCommand')

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const arbitrageCommand = new ArbitrageCommand()
const autoArbCommand = adminGuard.protect(new ChangeAutoArbitrageCommand())
const crossingCommand = adminGuard.protect(new CrossingCountsCommand())
const portfolioCommand = new UpdatePortfolioCommand()

module.exports = {
  arbitragemHandler: arbitrageCommand.asHandler(),
  changeAutoArbitragemHandler: autoArbCommand.asNoArgsHandler(),
  crossingCountsHandler: crossingCommand.asNoArgsHandler(),
  atualizarCotacaoHandler: portfolioCommand.asNoArgsHandler(),
}
