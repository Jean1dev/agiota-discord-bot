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

  constructor() {
    this.dividas = []
    this.gravacoes = []
    this.conversationHistory = []
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