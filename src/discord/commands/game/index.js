const { PlaceBetCommand } = require('./PlaceBetCommand')
const { GameStatsCommand } = require('./GameStatsCommand')

const placeBetCommand = new PlaceBetCommand()
const gameStatsCommand = new GameStatsCommand()

module.exports = {
  jogoBixoHandler: placeBetCommand.asHandler(),
  estatisticasJogoBixoHandler: gameStatsCommand.asNoArgsHandler(),
}
