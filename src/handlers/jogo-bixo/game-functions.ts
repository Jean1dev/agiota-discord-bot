import { contextInstance } from '../../context'
import { JOGO_BIXO_CHANNEL } from '../../discord/DiscordConstants'
import bichos from './bicho'
import { Jogo, Aposta } from './jogo'
import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('JogoBixo')

interface GameState {
  jogoAberto: boolean
  jogo: Jogo | null
  monitoramentoFimDeJogoRef: ReturnType<typeof setInterval> | null
}

const state: GameState = {
  jogoAberto: false,
  jogo: null,
  monitoramentoFimDeJogoRef: null,
}

function mandarMensagemNoChatGeral(message: string): void {
  const channel = (contextInstance().client.channels.cache as any).find(
    (ch: any) => ch.name === JOGO_BIXO_CHANNEL
  )
  if (channel) channel.send(message)
}

function verificarSeTerminouOTempoDeJogo(
  diaHoje: number,
  diaInicioJogo: number,
  horaAgoraUtc: number,
  horaInicioJogo: number,
  horaFimJogoUtc: number
): boolean {
  if (diaHoje === diaInicioJogo) return horaAgoraUtc > horaFimJogoUtc
  let diferenca = horaAgoraUtc - horaInicioJogo
  if (diferenca < 0) diferenca *= -1
  return diferenca > state.jogo!.duracao
}

function monitorarFimDeJogo(): void {
  state.monitoramentoFimDeJogoRef = setInterval(() => {
    log.debug('verificando se o jogo terminou')
    const dataFimJogoMili = state.jogo!.dataInicioDetalhes.hourUTC + state.jogo!.duracao
    const dataAtualDetalhes = { hourUTC: new Date().getUTCHours(), day: new Date().getDay() }

    const deveFinalizar = verificarSeTerminouOTempoDeJogo(
      dataAtualDetalhes.day,
      state.jogo!.dataInicioDetalhes.day,
      dataAtualDetalhes.hourUTC,
      state.jogo!.dataInicioDetalhes.hourUTC,
      dataFimJogoMili
    )

    if (deveFinalizar) {
      clearInterval(state.monitoramentoFimDeJogoRef!)
      state.monitoramentoFimDeJogoRef = null
      finalizarJogo('Jogo finalizado, jaja vou calcular os resultados e publico aqui')
    }
  }, 60000)
}

function calcularVencedores(apostas: Aposta[]): { bichoVencedor: any; apostadoresVencedores?: Aposta[] } {
  if (!apostas.length) {
    mandarMensagemNoChatGeral('Não teve nenhuma aposta, entao nao existem ganhadores')
    return { bichoVencedor: null }
  }

  const numeroVencedor = Math.floor(Math.random() * 100)
  const bichoVencedor = bichos.find(b => b.valores.includes(numeroVencedor))!

  const apostadoresVencedores = apostas.filter(a => {
    if (bichoVencedor.valores.includes(Number(a.numero))) return true
    return a.segundoNumero ? bichoVencedor.valores.includes(Number(a.segundoNumero)) : false
  })

  if (!apostadoresVencedores.length) {
    mandarMensagemNoChatGeral(`não houve ganhadores, o bixo sorteado foi ${bichoVencedor.emoj}`)
    mandarMensagemNoChatGeral(`numero sorteado foi ${numeroVencedor} o animal ${bichoVencedor.nome} tem os seguintes numeros ${bichoVencedor.valores.join(',')}`)
    return { bichoVencedor }
  }

  for (const vencedor of apostadoresVencedores) {
    if (vencedor.numero === numeroVencedor) {
      mandarMensagemNoChatGeral(`Parabens <@${vencedor.autor}> voce acertou em cheio no bixo ${bichoVencedor.emoj}`)
    } else {
      mandarMensagemNoChatGeral(`Parabens <@${vencedor.autor}> voce acertou no bixo ${bichoVencedor.emoj}`)
    }
    mandarMensagemNoChatGeral(`numero sorteado foi ${numeroVencedor} o animal ${bichoVencedor.nome} tem os seguintes numeros ${bichoVencedor.valores.join(',')}`)
  }

  return { bichoVencedor, apostadoresVencedores }
}

function finalizarJogo(message: string): void {
  if (!state.jogoAberto) return
  mandarMensagemNoChatGeral(message)
  const vencedor = calcularVencedores(contextInstance().jogo.apostas)

  MongoConnection.getCollection('jogo_bixo_registros')
    .insertOne({ vencedor, ...contextInstance().jogo })
    .then(() => {
      contextInstance().jogoAberto = false
      contextInstance().jogo = null
      updateState()
      contextInstance().save()
    })
}

export function criarNovoJogo(): void {
  if (state.jogoAberto) return
  if (new Date().getUTCHours() + 8 > 24) {
    mandarMensagemNoChatGeral('Não é possivel criar um jogo depois das 14h horario de brasilia')
    return
  }
  contextInstance().jogoAberto = true
  contextInstance().jogo = new Jogo()
  contextInstance().save()
  updateState()
  monitorarFimDeJogo()
  mandarMensagemNoChatGeral('Salve salve RAPAZEADA ta rolando jogo do bixo, façam suas apostas')
}

export function registrarAposta(aposta: Aposta): { status: boolean; message: string | null } {
  if (!state.jogoAberto) return { status: false, message: 'Não existe um jogo aberto' }

  const jaRealizada = state.jogo!.apostas.find(({ autor }) => autor === aposta.autor)
  if (jaRealizada) return { status: false, message: 'aposta ja realizada pelo usuario' }
  if (aposta.numero > 99 || aposta.numero < 0) return { status: false, message: 'aposta ja realizada pelo usuario' }

  state.jogo!.registrarAposta(aposta)
  contextInstance().jogo = state.jogo
  contextInstance().save()
  return { status: true, message: null }
}

function updateState(): void {
  const ctx = contextInstance()
  if (ctx.jogo && typeof (ctx.jogo as any).registrarAposta !== 'function') {
    const jogo = new Jogo()
    jogo.apostas = ctx.jogo.apostas
    jogo.data = ctx.jogo.data
    jogo.dataInicioDetalhes = ctx.jogo.dataInicioDetalhes
    jogo.duracao = ctx.jogo.duracao
    jogo.id = ctx.jogo.id
    state.jogoAberto = true
    state.jogo = jogo
    return
  }
  state.jogoAberto = ctx.jogoAberto
  state.jogo = ctx.jogo
}

export function updateStateAfterDataLoad(): void {
  if (contextInstance().jogoAberto) {
    updateState()
    monitorarFimDeJogo()
  }
}
