import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { CHAT_GERAL } from '../../discord/DiscordConstants'
import { rankingService } from '../ranking/RankingService'
import { createLogger } from '../../shared/logger/Logger'
import type { Client } from 'discord.js'

const log = createLogger('UserAnalyticsService')

// eslint-disable-next-line @typescript-eslint/no-require-imports
function getClient(): Client { return require('../../context').contextInstance().client }

const ANALISE_DADOS_COLLECTION = 'analise_dados_usuarios'

interface DiscordMessageData {
  username: string
  message: string
  userId: string
  channelId: string
  anexos: Record<string, unknown>
}

const state = { registros: [] as DiscordMessageData[] }

export function registrarEntradaTexto(discordMessage: {
  content: string
  author: { username: string; id: string }
  channelId: string
  attachments: Record<string, unknown>
}): void {
  if (discordMessage.content.startsWith('$')) return
  state.registros.push({
    username: discordMessage.author.username,
    message: discordMessage.content,
    userId: discordMessage.author.id,
    channelId: discordMessage.channelId,
    anexos: discordMessage.attachments,
  })
}

export function getRegistros(): DiscordMessageData[] { return state.registros }

export function clearRegistros(): void {
  MongoConnection.getCollection<DiscordMessageData>(ANALISE_DADOS_COLLECTION)
    .insertMany(state.registros as never[])
    .then(() => {
      log.info({ count: state.registros.length }, 'registros inseridos para análise')
      state.registros = []
    })
    .catch(err => log.error({ err }, 'clearRegistros failed'))
}

function executarRegraPontuacao(chars: number, anexos: number): number {
  return Math.trunc((chars / 100) + (anexos / 10) + 1)
}

async function exibirDadosUsuarioERankear(userId: string, mensagens: DiscordMessageData[]): Promise<void> {
  const client = getClient()
  const chatGeral = client.channels.cache.find(ch => (ch as { name: string }).name === CHAT_GERAL) as { send(m: string): void } | undefined

  let chars = 0, anexos = 0
  for (const m of mensagens) {
    chars += m.message.length
    if (Object.keys(m.anexos).length) anexos++
  }

  const pontuacao = executarRegraPontuacao(chars, anexos)
  await rankingService.criarOuAtualizarRanking({ userId, pontuacao, operacao: 'ADICIONAR' })

  if (pontuacao > 100) {
    chatGeral?.send(`<@${userId}> nessa rodada vc conseguiu ${pontuacao} pontos`)
  }
}

export async function rankearUso(): Promise<void> {
  const col = MongoConnection.getCollection<DiscordMessageData>(ANALISE_DADOS_COLLECTION)
  const elements = await col.find({}).toArray()

  const grouped = elements.reduce<Record<string, DiscordMessageData[]>>((acc, cur) => {
    ;(acc[cur.userId] ??= []).push(cur)
    return acc
  }, {})

  for (const [userId, msgs] of Object.entries(grouped)) {
    await exibirDadosUsuarioERankear(userId, msgs)
  }

  await col.deleteMany({})
}

export function exibirRankingNoChat(): void {
  const client = getClient()
  const chatGeral = client.channels.cache.find(ch => (ch as { name: string }).name === CHAT_GERAL) as { send(m: string): void } | undefined

  rankingService.listagem().then(data => {
    data
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .forEach(item => chatGeral?.send(`<@${item.userId}> voce tem um total de ${item.pontuacao}`))
  })
}
