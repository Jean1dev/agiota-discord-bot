import { AdminGuard } from '../../guards/AdminGuard'
import { ConfigAuthorizationService } from '../../guards/AuthorizationService'
import { ArbitrageCommand } from './ArbitrageCommand'
import { ChangeAutoArbitrageCommand } from './ChangeAutoArbitrageCommand'
import { CrossingCountsCommand } from './CrossingCountsCommand'
import { UpdatePortfolioCommand } from './UpdatePortfolioCommand'

const auth = new ConfigAuthorizationService(process.env.ADMIN_DISCORD_USER_IDS ?? '')
const adminGuard = new AdminGuard(auth)

const arbitrageCommand = new ArbitrageCommand()
const autoArbCommand = adminGuard.protect(new ChangeAutoArbitrageCommand())
const crossingCommand = adminGuard.protect(new CrossingCountsCommand())
const portfolioCommand = new UpdatePortfolioCommand()

export const arbitragemHandler = arbitrageCommand.asHandler()
export const changeAutoArbitragemHandler = autoArbCommand.asNoArgsHandler()
export const crossingCountsHandler = crossingCommand.asNoArgsHandler()
export const atualizarCotacaoHandler = portfolioCommand.asNoArgsHandler()
