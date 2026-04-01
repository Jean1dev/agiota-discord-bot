const { HelpCommand } = require('./HelpCommand')
const { ImgurCommand } = require('./ImgurCommand')

const helpCommand = new HelpCommand()
const imgurCommand = new ImgurCommand()

module.exports = {
  helpHandler: helpCommand.asNoArgsHandler(),
  imgurHandler: imgurCommand.asNoArgsHandler(),
}
