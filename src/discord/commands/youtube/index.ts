import { YoutubeAuthCommand } from './YoutubeAuthCommand'
import { YoutubeWatchLaterCommand } from './YoutubeWatchLaterCommand'
import { YoutubeWatchLaterClearCommand } from './YoutubeWatchLaterClearCommand'

const ytAuthCommand = new YoutubeAuthCommand()
const ytWlCommand = new YoutubeWatchLaterCommand()
const ytWlClearCommand = new YoutubeWatchLaterClearCommand()

export const youtubeAuthHandler = ytAuthCommand.asNoArgsHandler()
export const youtubeWatchLaterHandler = ytWlCommand.asNoArgsHandler()
export const youtubeWatchLaterClearHandler = ytWlClearCommand.asNoArgsHandler()
