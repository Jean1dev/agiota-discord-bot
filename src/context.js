const repository = require('./repository/operations')

class Context {
  player
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
    this.tryLoadData()
  }

  setClient(client) {
    this.client = client
  }

  async tryLoadData() {
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

module.exports = new Context()

const appEvents = require('./app-events')