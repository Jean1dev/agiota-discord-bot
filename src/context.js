const repository = require('./repository/operations')

class Context {
  player
  dividas
  acoes

  constructor() {
    this.dividas = []
    this.acoes = []
    this.tryLoadData()
  }

  tryLoadData() {
    try {
      const data = repository.getData()
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
