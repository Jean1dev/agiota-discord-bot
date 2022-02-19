const { randomUUID } = require('crypto')

class Jogo {
  id
  data
  dataInicioMiliseconds
  apostas
  resultado
  duracao = 28800000 // https://convertlive.com/pt/u/converter/horas/em/milissegundos#8

  constructor () {
    this.id = randomUUID()
    this.data = new Date()
    this.dataInicioMiliseconds = new Date().getMilliseconds()
    this.apostas = []
  }

  registrarAposta(aposta) {
    this.apostas.push(aposta)
  }
}

module.exports = Jogo
