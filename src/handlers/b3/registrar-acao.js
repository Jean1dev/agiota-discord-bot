const context = require('../../context')

module.exports = async (args, message) => {
  const papel = args[1]
  message.reply('papel registrado')
  context.acoes.push({
    papel
  })

  context.save()
}
