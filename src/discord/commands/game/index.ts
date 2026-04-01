import { PlaceBetCommand } from './PlaceBetCommand'
import { GameStatsCommand } from './GameStatsCommand'

const placeBetCommand = new PlaceBetCommand()
const gameStatsCommand = new GameStatsCommand()

export const jogoBixoHandler = placeBetCommand.asHandler()
export const estatisticasJogoBixoHandler = gameStatsCommand.asNoArgsHandler()
