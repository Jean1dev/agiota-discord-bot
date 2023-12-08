const repository = require('./repository/operations')

const state = {
  context: null
}

function createContext() {
  state.context = new Context()
  return state.context
}

class Context {
  dividas
  client
  gravacoes
  isIAEnabled = false
  isChatGPTEnabled = true
  jogoAberto = false
  jogo
  telegramIds

  constructor() {
    this.dividas = []
    this.gravacoes = []
    this.conversationHistory = []
  }

  addTelegramId(id, callback) {
    if (!this.telegramIds) {
      this.telegramIds = []
      this.telegramIds.push({
        chatId: id,
        callback
      })
      console.log('Adicionado telegram id no context ', id)
      return
    }

    const find = this.telegramIds.find(it => it === id)
    if (!find) {
      this.telegramIds.push({
        chatId: id,
        callback
      })
      console.log('Adicionado telegram id no context ', id)
    }

  }

  setClient(client) {
    this.client = client
  }

  async fillState() {
    try {
      const data = await repository.getData()
      this.dividas = data?.dividas
      this.jogoAberto = data?.jogoAberto
      this.jogo = data?.jogo
      //TODO:: refatorar o inicio disso no futuro
      appEvents.emit('update-state-jogo-bixo', null)

    } catch (error) {
      console.log(error)
    }
  }

  save() {
    repository.save({
      dividas: this.dividas,
      jogoAberto: this.jogoAberto,
      jogo: this.jogo
    })
  }
}

module.exports = {
  contextInstance: () => { return state.context },
  createContext
}

const appEvents = require('./app-events')