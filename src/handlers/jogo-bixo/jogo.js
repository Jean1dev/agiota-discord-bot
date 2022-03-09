const { randomUUID } = require('crypto')

class Jogo {
  id
  data
  dataInicioDetalhes
  apostas
  resultado
  duracao = 8

  constructor () {
    this.id = randomUUID()
    this.data = new Date()
    this.dataInicioDetalhes = {
      hourUTC: new Date().getUTCHours(),
      day: new Date().getDay()
    }
    this.apostas = []
  }

  registrarAposta(aposta) {
    this.apostas.push(aposta)
  }
}

module.exports = Jogo
