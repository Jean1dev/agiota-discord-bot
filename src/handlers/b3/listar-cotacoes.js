const context = require('../../context')

function deleteMessageAfterTime(message) {
  setTimeout(() => message.delete(), 10000)
}

module.exports = async message => {
  deleteMessageAfterTime(message)

  if (!context.acoes.length) {
    message.channel.send(`Nenhum papel salvo`).then(deleteMessageAfterTime)
    return
  }

  message.channel.send(`pesquisando a ultima cotacao dos papeis`).then(deleteMessageAfterTime)

  context.acoes.forEach(({ papel, image }) => {
    message.channel.send(`\n ${papel}`).then(deleteMessageAfterTime)
  })

}

