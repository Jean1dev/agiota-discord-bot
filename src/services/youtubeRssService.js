'use strict'

const { google } = require('googleapis')
const googleOAuthState = require('../adapters/google-Oauth')
const config = require('../config')

const MS_24H = 24 * 60 * 60 * 1000

function shortsPlaylistId(channelId) {
  if (!channelId || !channelId.startsWith('UC')) return null
  return 'UUSH' + channelId.slice(2)
}

function getYoutubeClient() {
  if (!googleOAuthState.authorized) {
    throw new Error('YouTube não autorizado. Use o authUrl e setAuthToken(code).')
  }
  return google.youtube({ version: 'v3', auth: googleOAuthState.client })
}

function publishedAfterIso() {
  return new Date(Date.now() - MS_24H).toISOString()
}

const YOUTUBE_THUMB_URL = 'https://img.youtube.com/vi'

function mapActivityToVideo(item, channelId) {
  const upload = item.contentDetails?.upload
  if (!upload?.videoId) return null
  const sn = item.snippet || {}
  const published = sn.publishedAt ? new Date(sn.publishedAt) : null
  if (!published) return null
  const videoId = upload.videoId
  return {
    videoId,
    title: sn.title || '(sem título)',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumb: `${YOUTUBE_THUMB_URL}/${videoId}/mqdefault.jpg`,
    published,
    channelId: channelId || sn.channelId || ''
  }
}

async function getSubscribedChannelIds(youtube) {
  const channelIds = []
  let pageToken = null
  do {
    const res = await youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
      pageToken: pageToken || undefined
    })
    const items = res.data.items || []
    for (const item of items) {
      const id = item.snippet?.resourceId?.channelId
      if (id) channelIds.push(id)
    }
    pageToken = res.data.nextPageToken || null
  } while (pageToken)
  return channelIds
}

async function fetchActivitiesFromChannels(youtube, channelIds, publishedAfter) {
  const allVideos = []
  for (const channelId of channelIds) {
    try {
      const res = await youtube.activities.list({
        part: ['snippet', 'contentDetails'],
        channelId,
        publishedAfter,
        maxResults: 10
      })
      const items = res.data.items || []
      for (const item of items) {
        const video = mapActivityToVideo(item, channelId)
        if (video) allVideos.push(video)
      }
    } catch (_) {}
  }
  return allVideos
}

async function fetchShortsVideoIdsForChannel(youtube, channelId) {
  const playlistId = shortsPlaylistId(channelId)
  if (!playlistId) return new Set()
  const ids = new Set()
  let pageToken = null
  do {
    try {
      const res = await youtube.playlistItems.list({
        part: ['contentDetails'],
        playlistId,
        maxResults: 50,
        pageToken: pageToken || undefined
      })
      const items = res.data.items || []
      for (const item of items) {
        const vid = item.contentDetails?.videoId
        if (vid) ids.add(vid)
      }
      pageToken = res.data.nextPageToken || null
    } catch (_) {
      break
    }
  } while (pageToken)
  return ids
}

async function fetchShortsIdsByChannel(youtube, channelIds) {
  const map = new Map()
  for (const channelId of channelIds) {
    const set = await fetchShortsVideoIdsForChannel(youtube, channelId)
    if (set.size) map.set(channelId, set)
  }
  return map
}

async function fetchVideosFromLast24Hours() {
  const start = Date.now()
  const youtube = getYoutubeClient()
  const publishedAfter = publishedAfterIso()

  const channelIds = await getSubscribedChannelIds(youtube)
  const maxChannels =
    config.YOUTUBE_MAX_CHANNELS > 0
      ? config.YOUTUBE_MAX_CHANNELS
      : channelIds.length
  const channelsToFetch = channelIds.slice(0, maxChannels)

  const allVideos = await fetchActivitiesFromChannels(
    youtube,
    channelsToFetch,
    publishedAfter
  )

  const uniqueChannelIds = [...new Set(allVideos.map((v) => v.channelId).filter(Boolean))]
  const shortsByChannel = await fetchShortsIdsByChannel(youtube, uniqueChannelIds)

  const filtered = allVideos.filter((v) => {
    const shortsSet = shortsByChannel.get(v.channelId)
    return !shortsSet || !shortsSet.has(v.videoId)
  })
  filtered.sort((a, b) => b.published.getTime() - a.published.getTime())

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(
    `[YouTube RSS] processamento em ${elapsed}s | ${channelIds.length} canais | ${filtered.length} vídeos (excl. Shorts)`
  )
  return filtered
}

function isAuthorized() {
  return googleOAuthState.authorized
}

function getAuthUrl() {
  return typeof googleOAuthState.getAuthUrl === 'function'
    ? googleOAuthState.getAuthUrl()
    : googleOAuthState.authUrl
}

async function runAndNotify() {
  if (!isAuthorized()) {
    console.warn('YouTube RSS: não autorizado. Use getAuthUrl() e setAuthToken(code).')
    return []
  }
  try {
    const videos = await fetchVideosFromLast24Hours()
    return videos
  } catch (err) {
    console.error('YouTube RSS:', err.message)
    throw err
  }
}

const WATCH_LATER_PLAYLIST_ID = 'WL'

async function addToWatchLaterPlaylist(videoId) {
  const youtube = getYoutubeClient()
  await youtube.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId: WATCH_LATER_PLAYLIST_ID,
        resourceId: {
          kind: 'youtube#video',
          videoId
        }
      }
    }
  })
}

module.exports = {
  fetchVideosFromLast24Hours,
  runAndNotify,
  isAuthorized,
  getAuthUrl,
  setAuthToken: googleOAuthState.setAuthToken,
  addToWatchLaterPlaylist
}