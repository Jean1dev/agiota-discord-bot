const { client: MongoClient, DATABASE } = require('../../repository/mongodb')
const Jogo = require('./jogo')
const context = require('../../context')

const state = {
  jogoAberto: false,
  jogo: null,
  monitoramentoFimDeJogoRef: null
}

function mandarMensagemNoChatGeral(message) {
  const channel = context.client.channels.cache.find(channel => channel.name === '🧵-geral')
  if (channel) {
    channel.send(message)
  }
}

function monitorarFimDeJogo() {
  state.monitoramentoFimDeJogoRef = setInterval(() => {
    console.log('verificando se o jogo terminou')
    const dataFimJogoMili = state.jogo.dataInicioMiliseconds + state.jogo.duracao
    const dataAtualMili = new Date().getMilliseconds()
    if (dataAtualMili > dataFimJogoMili) {
      clearInterval(state.monitoramentoFimDeJogoRef)
      state.monitoramentoFimDeJogoRef = null
      finalizarJogo('Jogo finalizado, jaja vou calcular os resultados e publico aqui')
    }

  }, 60000)
}

function criarNovoJogo() {
  if (state.jogoAberto) {
    return
  }

  context.jogoAberto = true
  context.jogo = new Jogo()
  context.save()
  updateState()
  monitorarFimDeJogo()
  mandarMensagemNoChatGeral('Salve salve RAPAZEADA ta rolando jogo do bixo, façam suas apostas')
}

function finalizarJogo() {
  if (!state.jogoAberto) {
    return
  }

  MongoClient.connect().then(client => {
    client.db(DATABASE).collection('jogo_bixo_registros').insertOne(context.jogo).then(() => {
      console.log('jogo salvo')
      context.jogoAberto = false
      context.jogo = null
      updateState()
      client.close().then(() => console.log('conexao fechada'))
    })
  })
}

function registrarAposta(aposta) {
  if (!state.jogoAberto) {
    return false
  }

  state.jogo.registrarAposta(aposta)
  context.jogo = state.jogo
  context.save()
  return true
}

function updateState() {
  state.jogoAberto = context.jogoAberto
  state.jogo = context.jogo
}

function updateStateAfterDataLoad() {
  if (context.jogoAberto) {
    updateState()
    monitorarFimDeJogo()
  }
}


module.exports = {
  registrarAposta,
  criarNovoJogo,
  updateStateAfterDataLoad
}
