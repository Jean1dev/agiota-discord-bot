const comandos = require('./lista-comandos')

async function handleAgtCommand(command, args, message) {
  const funcaoHandlerData = comandos.find(item => item.comando === command)
  if (!funcaoHandlerData) {
    return
  }

  const fnc = funcaoHandlerData.handler
  if (funcaoHandlerData.needArgs) {
    return fnc(args, message)
  }

  return fnc(message)
}

module.exports = async (command, args, message) => {
  return handleAgtCommand(command, args, message)
}
