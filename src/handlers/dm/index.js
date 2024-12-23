const { CHAT_GERAL } = require("../../discord-constants")
const { runQuizTask } = require("../../services")

function dmQuiz() {
  runQuizTask()
}

module.exports = (message, client) => {
  if (message.content === 'quiz') {
    setTimeout(dmQuiz, 2000)
    return
  }

  const channel = client.channels.cache.find(channel => channel.name === CHAT_GERAL)
  if (channel && channel.send) {
    setTimeout(() => {
      channel.send(message.content)
    }, 2000)
  }
}
