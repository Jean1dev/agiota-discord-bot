import { HelpCommand } from './HelpCommand'
import { ImgurCommand } from './ImgurCommand'

const helpCommand = new HelpCommand()
const imgurCommand = new ImgurCommand()

export const helpHandler = helpCommand.asNoArgsHandler()
export const imgurHandler = imgurCommand.asNoArgsHandler()
