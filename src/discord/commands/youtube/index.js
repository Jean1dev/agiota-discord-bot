const { YoutubeAuthCommand } = require('./YoutubeAuthCommand')
const { YoutubeWatchLaterCommand } = require('./YoutubeWatchLaterCommand')
const { YoutubeWatchLaterClearCommand } = require('./YoutubeWatchLaterClearCommand')

const ytAuthCommand = new YoutubeAuthCommand()
const ytWlCommand = new YoutubeWatchLaterCommand()
const ytWlClearCommand = new YoutubeWatchLaterClearCommand()

module.exports = {
  youtubeAuthHandler: ytAuthCommand.asNoArgsHandler(),
  youtubeWatchLaterHandler: ytWlCommand.asNoArgsHandler(),
  youtubeWatchLaterClearHandler: ytWlClearCommand.asNoArgsHandler(),
}
