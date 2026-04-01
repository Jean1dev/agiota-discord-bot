import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('YoutubeRssService')

// google-Oauth ainda é JS — será migrado na Fase 9
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleOAuthState = require('../../adapters/google-Oauth')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { google } = require('googleapis')

const MS_24H = 24 * 60 * 60 * 1000
const YOUTUBE_THUMB_URL = 'https://img.youtube.com/vi'

export interface YoutubeVideo {
  videoId: string
  title: string
  url: string
  thumb: string
  published: Date
  channelId: string
}

// ── Auth helpers ──────────────────────────────────────────────────────────

export function isAuthorized(): boolean {
  return googleOAuthState.authorized as boolean
}

export function getAuthUrl(): string {
  return typeof googleOAuthState.getAuthUrl === 'function'
    ? googleOAuthState.getAuthUrl()
    : googleOAuthState.authUrl
}

export function setAuthToken(code: string): Promise<void> {
  return googleOAuthState.setAuthToken(code) as Promise<void>
}

function getYoutubeClient() {
  if (!googleOAuthState.authorized) {
    throw new Error('YouTube não autorizado. Use o authUrl e setAuthToken(code).')
  }
  return google.youtube({ version: 'v3', auth: googleOAuthState.client })
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

function shortsPlaylistId(channelId: string): string | null {
  if (!channelId?.startsWith('UC')) return null
  return 'UUSH' + channelId.slice(2)
}

function mapActivityToVideo(item: Record<string, unknown>, channelId: string): YoutubeVideo | null {
  const contentDetails = item.contentDetails as Record<string, unknown> | undefined
  const upload = contentDetails?.upload as Record<string, unknown> | undefined
  if (!upload?.videoId) return null
  const sn = (item.snippet as Record<string, unknown>) ?? {}
  const published = sn.publishedAt ? new Date(sn.publishedAt as string) : null
  if (!published) return null
  const videoId = upload.videoId as string
  return {
    videoId,
    title: (sn.title as string) || '(sem título)',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumb: `${YOUTUBE_THUMB_URL}/${videoId}/mqdefault.jpg`,
    published,
    channelId: channelId || (sn.channelId as string) || '',
  }
}

async function getSubscribedChannelIds(youtube: unknown): Promise<string[]> {
  const yt = youtube as { subscriptions: { list(p: unknown): Promise<{ data: { items?: unknown[]; nextPageToken?: string } }> } }
  const channelIds: string[] = []
  let pageToken: string | null = null
  do {
    const res = await yt.subscriptions.list({ part: ['snippet'], mine: true, maxResults: 50, pageToken: pageToken ?? undefined })
    for (const item of res.data.items ?? []) {
      const id = (item as { snippet?: { resourceId?: { channelId?: string } } }).snippet?.resourceId?.channelId
      if (id) channelIds.push(id)
    }
    pageToken = res.data.nextPageToken ?? null
  } while (pageToken)
  return channelIds
}

async function fetchShortsIdsForChannel(youtube: unknown, channelId: string): Promise<Set<string>> {
  const yt = youtube as { playlistItems: { list(p: unknown): Promise<{ data: { items?: unknown[]; nextPageToken?: string } }> } }
  const playlistId = shortsPlaylistId(channelId)
  if (!playlistId) return new Set()
  const ids = new Set<string>()
  let pageToken: string | null = null
  do {
    try {
      const res = await yt.playlistItems.list({ part: ['contentDetails'], playlistId, maxResults: 50, pageToken: pageToken ?? undefined })
      for (const item of res.data.items ?? []) {
        const vid = (item as { contentDetails?: { videoId?: string } }).contentDetails?.videoId
        if (vid) ids.add(vid)
      }
      pageToken = res.data.nextPageToken ?? null
    } catch { break }
  } while (pageToken)
  return ids
}

async function fetchVideosFromLast24Hours(): Promise<YoutubeVideo[]> {
  const start = Date.now()
  const youtube = getYoutubeClient()
  const publishedAfter = new Date(Date.now() - MS_24H).toISOString()

  const channelIds = await getSubscribedChannelIds(youtube)
  const maxChannels = (env.YOUTUBE_MAX_CHANNELS ?? 0) > 0 ? env.YOUTUBE_MAX_CHANNELS : channelIds.length
  const toFetch = channelIds.slice(0, maxChannels)

  const allVideos: YoutubeVideo[] = []
  const yt = youtube as { activities: { list(p: unknown): Promise<{ data: { items?: unknown[] } }> } }
  for (const channelId of toFetch) {
    try {
      const res = await yt.activities.list({ part: ['snippet', 'contentDetails'], channelId, publishedAfter, maxResults: 10 })
      for (const item of res.data.items ?? []) {
        const video = mapActivityToVideo(item as Record<string, unknown>, channelId)
        if (video) allVideos.push(video)
      }
    } catch { /* skip unreachable channels */ }
  }

  const uniqueChannels = [...new Set(allVideos.map(v => v.channelId).filter(Boolean))]
  const shortsByChannel = new Map<string, Set<string>>()
  for (const cid of uniqueChannels) {
    const set = await fetchShortsIdsForChannel(youtube, cid)
    if (set.size) shortsByChannel.set(cid, set)
  }

  const filtered = allVideos
    .filter(v => !shortsByChannel.get(v.channelId)?.has(v.videoId))
    .sort((a, b) => b.published.getTime() - a.published.getTime())

  log.info({ elapsed: ((Date.now() - start) / 1000).toFixed(1), channels: channelIds.length, videos: filtered.length }, 'YouTube RSS done')
  return filtered
}

// ── Watch-later playlist ──────────────────────────────────────────────────

function parsePlaylistId(value: string | undefined): string | null {
  if (!value) return null
  const raw = value.trim()
  if (raw === 'WL') return null
  if (/^PL[\w-]+$/.test(raw)) return raw
  try {
    const list = new URL(raw).searchParams.get('list')
    if (list && /^PL[\w-]+$/.test(list)) return list
  } catch { /* not a URL */ }
  return null
}

export async function addToWatchLaterPlaylist(videoId: string): Promise<void> {
  const playlistId = parsePlaylistId(env.YOUTUBE_WATCH_LATER_PLAYLIST_ID)
  if (!playlistId) throw new Error('YOUTUBE_WATCH_LATER_PLAYLIST_ID inválido ou não configurado.')
  const yt = getYoutubeClient() as { playlistItems: { insert(p: unknown): Promise<unknown> } }
  await yt.playlistItems.insert({ part: ['snippet'], requestBody: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } } })
}

export async function clearWatchLaterPlaylist(): Promise<number> {
  const playlistId = parsePlaylistId(env.YOUTUBE_WATCH_LATER_PLAYLIST_ID)
  if (!playlistId) throw new Error('YOUTUBE_WATCH_LATER_PLAYLIST_ID inválido ou não configurado.')
  const yt = getYoutubeClient() as {
    playlistItems: {
      list(p: unknown): Promise<{ data: { items?: unknown[]; nextPageToken?: string } }>
      delete(p: unknown): Promise<void>
    }
  }
  const itemIds: string[] = []
  let pageToken: string | null = null
  do {
    const res = await yt.playlistItems.list({ part: ['id'], playlistId, maxResults: 50, pageToken: pageToken ?? undefined })
    for (const item of res.data.items ?? []) {
      const id = (item as { id?: string }).id
      if (id) itemIds.push(id)
    }
    pageToken = res.data.nextPageToken ?? null
  } while (pageToken)
  for (const id of itemIds) await yt.playlistItems.delete({ id })
  return itemIds.length
}

// ── Public API ────────────────────────────────────────────────────────────

export async function runAndNotify(): Promise<YoutubeVideo[]> {
  if (!isAuthorized()) {
    log.warn('YouTube RSS: não autorizado')
    return []
  }
  return fetchVideosFromLast24Hours()
}
