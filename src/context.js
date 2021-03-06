const repository = require('./repository/operations')

class Context {
  player
  dividas
  acoes
  client
  gravacoes
  isIAEnabled = false
  jogoAberto = false
  jogo

  constructor() {
    this.dividas = []
    this.acoes = []
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
      this.acoes = data?.acoes
      this.jogoAberto = data?.jogoAberto
      this.jogo = data?.jogo
      appEvents.emit('update-state-jogo-bixo', null)

    } catch (error) {
      console.log(error)
    }
  }

  save() {
    repository.save({
      dividas: this.dividas,
      acoes: this.acoes,
      jogoAberto: this.jogoAberto,
      jogo: this.jogo
    })
  }
}

module.exports = new Context()

const appEvents = require('./app-events')