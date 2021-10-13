const repository = require('./repository/operations')

class Context {
  player
  dividas

  constructor() {
    this.dividas = []
    this.tryLoadData()
  }

  tryLoadData() {
    try {
      const data = repository.getData()
      this.dividas = data
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = new Context()
