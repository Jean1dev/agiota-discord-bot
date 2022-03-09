const { client: MongoClient, DATABASE } = require('../../repository/mongodb')
const Jogo = require('./jogo')
const context = require('../../context')
const bichos = require('./bicho')

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

function verificarSeTerminouOTempoDeJogo(diaHoje, diaInicioJogo, horaAgoraUtc, horaInicioJogo, horaFimJogoUtc) {
  if (diaHoje == diaInicioJogo) {
    return horaAgoraUtc > horaFimJogoUtc
  }

  let diferenca = horaAgoraUtc - horaInicioJogo

  if (diferenca < 0)
    diferenca = diferenca * -1

  return diferenca > state.jogo.duracao
}

function monitorarFimDeJogo() {
  state.monitoramentoFimDeJogoRef = setInterval(() => {
    console.log('verificando se o jogo terminou')
    const dataFimJogoMili = state.jogo.dataInicioDetalhes.hourUTC + state.jogo.duracao
    const dataAtualDetalhes = {
      hourUTC: new Date().getUTCHours(),
      day: new Date().getDay()
    }

    const deveFinalizar = verificarSeTerminouOTempoDeJogo(
      dataAtualDetalhes.day,
      state.jogo.dataInicioDetalhes.day,
      dataAtualDetalhes.hourUTC,
      state.jogo.dataInicioDetalhes.hourUTC,
      dataFimJogoMili
    )

    if (deveFinalizar) {
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

  if (new Date().getUTCHours() + 8 > 24) {
    mandarMensagemNoChatGeral('Não é possivel criar um jogo depois das 14h horario de brasilia')
    return
  }

  context.jogoAberto = true
  context.jogo = new Jogo()
  context.save()
  updateState()
  monitorarFimDeJogo()
  mandarMensagemNoChatGeral('Salve salve RAPAZEADA ta rolando jogo do bixo, façam suas apostas')
}

function calcularVencedores(apostas) {
  if (!apostas.length) {
    mandarMensagemNoChatGeral('Não teve nenhuma aposta, entao nao existem ganhadores')
    return
  }

  const numeroVencedor = Math.floor(Math.random() * 100)
  const bichoVencedor = bichos.find(bicho => {
    return bicho.valores.includes(numeroVencedor)
  })

  const apostadorVencedor = apostas.find(apostador => {
    return bichoVencedor.valores.includes(Number(apostador.numero))
  })

  if (!apostadorVencedor) {
    mandarMensagemNoChatGeral(`não houve ganhadores, o bixo sorteado foi ${bichoVencedor.emoj}`)
    return
  }

  if (apostadorVencedor.numero === numeroVencedor) {
    mandarMensagemNoChatGeral(`Parabens @${apostadorVencedor.autor} voce acertou em cheio no bixo ${bichoVencedor.emoj}`)
    return
  }

  mandarMensagemNoChatGeral(`Parabens @${apostadorVencedor.autor} voce acertou no bixo ${bichoVencedor.emoj}`)
}

function finalizarJogo(message) {
  if (!state.jogoAberto) {
    return
  }

  mandarMensagemNoChatGeral(message)
  calcularVencedores(context.jogo.apostas)
  MongoClient.connect().then(client => {
    client.db(DATABASE).collection('jogo_bixo_registros').insertOne(context.jogo).then(() => {
      console.log('jogo salvo')
      context.jogoAberto = false
      context.jogo = null
      updateState()
      client.close().then(() => {
        console.log('conexao fechada')
        context.save()
      })
    })
  })
}

function verificarSePodeContinuarAPosta(aposta) {
  const apostaJaRealizada = state.jogo.apostas.find(({ autor }) => autor == aposta.autor)
  if (apostaJaRealizada) {
    return false
  }

  if (aposta.numero > 99 || aposta.numero < 0) {
    return false
  }

  return true
}

function registrarAposta(aposta) {
  if (!state.jogoAberto) {
    return {
      status: false,
      message: 'Não existe um jogo aberto'
    }
  }

  if (!verificarSePodeContinuarAPosta(aposta)) {
    return {
      status: false,
      message: 'aposta ja realizada pelo usuario'
    }
  }

  state.jogo.registrarAposta(aposta)
  context.jogo = state.jogo
  context.save()

  return {
    status: true,
    message: null
  }
}

function updateState() {
  if (context.jogo && !context.jogo.hasOwnProperty('registrarAposta')) {
    const jogo = new Jogo()
    jogo.apostas = context.jogo.apostas
    jogo.data = context.jogo.data
    jogo.dataInicioDetalhes = context.jogo.dataInicioDetalhes
    jogo.duracao = context.jogo.duracao
    jogo.id = context.jogo.id
    state.jogoAberto = true
    state.jogo = jogo
    return
  }

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
