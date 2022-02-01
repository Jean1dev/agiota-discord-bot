const repository = require('./repository/operations')

class Context {
  player
  dividas
  acoes
  client

  constructor() {
    this.dividas = []
    this.acoes = []
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
    } catch (error) {
      console.log(error)
    }
  }

  save() {
    repository.save({
      dividas: this.dividas,
      acoes: this.acoes
    })
  }
}

module.exports = new Context()
