import comandos from './comandos-struct'
import './lista-comandos'

async function handleAgtCommand(command: string, args: string[], message: any): Promise<void> {
  const funcaoHandlerData = comandos.find(item => item.comando === command)
  if (!funcaoHandlerData) return

  const fnc = funcaoHandlerData.handler
  if (funcaoHandlerData.needArgs) {
    if (!args.length) {
      await message.reply('Informe os argumentos do comando seu cabaço')
      return
    }
    await fnc(args, message)
    return
  }

  await fnc(message)
}

const commandDispatcher = async (command: string, args: string[], message: any): Promise<void> => {
  return handleAgtCommand(command, args, message)
}

export default commandDispatcher
