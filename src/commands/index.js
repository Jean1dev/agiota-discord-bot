const comandos = require('./lista-comandos')

async function handleAgtCommand(args, message) {
  const command = args[0]
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
  if (command === '$') {
    return handleAgtCommand(args, message)
  }
}
