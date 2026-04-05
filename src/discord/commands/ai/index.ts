import { ChatGptCommand } from './ChatGptCommand'
import { ToggleIaModeCommand } from './ToggleIaModeCommand'

const chatGptCommand = new ChatGptCommand()
const toggleIaCommand = new ToggleIaModeCommand()

export const chatGpt = chatGptCommand.asHandler()
export const changeIaMode = toggleIaCommand.asNoArgsHandler()
