const { ChatGptCommand } = require('./ChatGptCommand')
const { ToggleIaModeCommand } = require('./ToggleIaModeCommand')

const chatGptCommand = new ChatGptCommand()
const toggleIaCommand = new ToggleIaModeCommand()

module.exports = {
  chatGpt: chatGptCommand.asHandler(),
  changeIaMode: toggleIaCommand.asNoArgsHandler(),
}
