const captureException = require('../observability/Sentry')
const { MONGO_URL } = require('../config')
const DATABASE = 'agiobot'
const MongoClient = require('mongodb').MongoClient
const client = new MongoClient(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })

let DbInstance = null

async function connect() {
  try {
    await client.connect()
    DbInstance = client.db(DATABASE)
    console.log('mongo connected')
  } catch (error) {
    captureException(error)
    throw error
  }
}

async function getDataFromMongo() {
  const data = await DbInstance.collection('data').find().toArray()

  if (!data.length) {
    return {
      dividas: [],
      jogoAberto: false,
      jogo: null,
      autoArbitragem: false
    }
  }

  return {
    dividas: data[0]['dividas'],
    jogoAberto: data[0]['jogoAberto'],
    jogo: data[0]['jogo'],
    totalGastoCartao: data[0]['totalGastoCartao'],
    autoArbitragem: data[0]['autoArbitragem']
  }
}

function save(object) {
  DbInstance.collection('data').deleteMany().then(() => {
    DbInstance.collection('data').insertOne(object).then(() => {
      console.log('context updated', object)
    })
  })
}

const YOUTUBE_RSS_COLLECTION = 'youtube_rss_videos'

async function saveYoutubeVideos(videos) {
  if (!videos || !videos.length) return
  if (!DbInstance) return
  const db = DbInstance
  const savedAt = new Date()
  const docs = videos.map((v) => ({
    videoId: v.videoId,
    thumb: v.thumb,
    title: v.title,
    link: v.url,
    watchLater: true,
    savedAt
  }))
  await db.collection(YOUTUBE_RSS_COLLECTION).insertMany(docs)
}

async function findYoutubeVideosWatchLater() {
  if (!DbInstance) return []
  return DbInstance.collection(YOUTUBE_RSS_COLLECTION)
    .find({ watchLater: true })
    .toArray()
}

async function deleteYoutubeVideosCollection() {
  if (!DbInstance) return
  await DbInstance.collection(YOUTUBE_RSS_COLLECTION).deleteMany({})
}

module.exports = {
  getDataFromMongo,
  save,
  saveYoutubeVideos,
  findYoutubeVideosWatchLater,
  deleteYoutubeVideosCollection,
  connect,
  DbInstance: () => {return DbInstance}
}
