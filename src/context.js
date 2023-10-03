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
  apostasRouletteAbertas
  apostasRoulette

  constructor() {
    this.dividas = []
    this.gravacoes = []
    this.apostasRouletteAbertas = false;
    this.apostasRoulette = {}
    this.tryLoadData()
    this.conversationHistory = []
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
      this.apostasRouletteAbertas = data?.apostasRouletteAbertas
      this.apostasRoulette = data?.apostasRoulette
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
      jogo: this.jogo,
      apostasRouletteAbertas: this.apostasRouletteAbertas,
      apostasRoulette: this.apostasRoulette
    })
  }
}

module.exports = new Context()

const appEvents = require('./app-events')