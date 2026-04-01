import { MongoConnection } from './MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoRepository')

// ── Context state (legado — será removido quando context.js for eliminado) ──

export interface ContextState {
  dividas: unknown[]
  jogoAberto: boolean
  jogo: unknown | null
  totalGastoCartao: number
  autoArbitragem: boolean
}

const DATA_COLLECTION = 'data'

export async function getContextState(): Promise<ContextState> {
  const col = MongoConnection.getCollection<ContextState & { _id?: unknown }>(DATA_COLLECTION)
  const rows = await col.find().toArray()

  const row = rows[0]
  if (!row) {
    return { dividas: [], jogoAberto: false, jogo: null, totalGastoCartao: 0, autoArbitragem: false }
  }

  return {
    dividas: row.dividas ?? [],
    jogoAberto: row.jogoAberto ?? false,
    jogo: row.jogo ?? null,
    totalGastoCartao: row.totalGastoCartao ?? 0,
    autoArbitragem: row.autoArbitragem ?? false,
  }
}

export function saveContextState(state: Record<string, unknown>): void {
  const col = MongoConnection.getCollection(DATA_COLLECTION)
  col.deleteMany({}).then(() =>
    col.insertOne(state).then(() => log.info('context state saved'))
  ).catch(err => log.error({ err }, 'failed to save context state'))
}

// ── YouTube RSS ───────────────────────────────────────────────────────────

const YOUTUBE_RSS_COLLECTION = 'youtube_rss_videos'

export interface YoutubeVideo {
  videoId: string
  thumb: string
  title: string
  url: string
}

export interface YoutubeVideoDoc {
  videoId: string
  thumb: string
  title: string
  link: string
  savedAt: Date
  watchLater?: boolean
}

export async function saveYoutubeVideos(videos: YoutubeVideo[]): Promise<void> {
  if (!videos.length) return
  const col = MongoConnection.getCollection<YoutubeVideoDoc>(YOUTUBE_RSS_COLLECTION)
  const savedAt = new Date()
  await col.insertMany(
    videos.map(v => ({ videoId: v.videoId, thumb: v.thumb, title: v.title, link: v.url, savedAt }))
  )
}

export async function findYoutubeVideosWatchLater(): Promise<YoutubeVideoDoc[]> {
  const col = MongoConnection.getCollection<YoutubeVideoDoc>(YOUTUBE_RSS_COLLECTION)
  return col.find({ watchLater: true }).toArray()
}

export async function deleteYoutubeVideosCollection(): Promise<void> {
  const col = MongoConnection.getCollection(YOUTUBE_RSS_COLLECTION)
  await col.deleteMany({})
}

// ── Google OAuth token ────────────────────────────────────────────────────

const GOOGLE_OAUTH_TOKEN_COLLECTION = 'google_oauth_token'
const TOKEN_EXPIRY_DAYS = 7

export async function getGoogleOAuthToken(): Promise<string | null> {
  const col = MongoConnection.getCollection<{ _id: string; token: string; expiresAt: Date }>(
    GOOGLE_OAUTH_TOKEN_COLLECTION
  )
  const doc = await col.findOne({ _id: 'google' } as never)
  if (!doc?.token) return null
  if (doc.expiresAt && new Date() >= new Date(doc.expiresAt)) return null
  return doc.token
}

export async function saveGoogleOAuthToken(token: string): Promise<void> {
  const col = MongoConnection.getCollection(GOOGLE_OAUTH_TOKEN_COLLECTION)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS)
  await col.updateOne(
    { _id: 'google' } as never,
    { $set: { token, expiresAt } },
    { upsert: true }
  )
}
