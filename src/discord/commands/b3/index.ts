import { ArbitrageCommand } from './ArbitrageCommand'
import { UpdatePortfolioCommand } from './UpdatePortfolioCommand'

const arbitrageCommand = new ArbitrageCommand()
const portfolioCommand = new UpdatePortfolioCommand()

export const arbitragemHandler = arbitrageCommand.asHandler()
export const atualizarCotacaoHandler = portfolioCommand.asNoArgsHandler()
