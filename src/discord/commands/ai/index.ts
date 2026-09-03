import { ChatGptCommand } from './ChatGptCommand'
import { ToggleIaModeCommand } from './ToggleIaModeCommand'
import { ModeloCommand } from './ModeloCommand'

const chatGptCommand = new ChatGptCommand()
const toggleIaCommand = new ToggleIaModeCommand()
const modeloCommand = new ModeloCommand()

export const chatGpt = chatGptCommand.asHandler()
export const changeIaMode = toggleIaCommand.asNoArgsHandler()

export const modelo = async (message: { content?: string }) => {
  const content = message.content ?? ''
  const body = content.replace(/^[$!]/, '').trim()
  const args = body.split(/\s+/).slice(1).filter(Boolean)
  await modeloCommand.execute({ message: message as any, args })
}
