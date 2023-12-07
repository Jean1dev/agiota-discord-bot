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
    captureException(reject)
    throw reject
  }
}

async function getDataFromMongo() {
  const data = await DbInstance.collection('data').find().toArray()

  if (!data.length) {
    return {
      dividas: [],
      jogoAberto: false,
      jogo: null
    }
  }

  return {
    dividas: data[0]['dividas'],
    jogoAberto: data[0]['jogoAberto'],
    jogo: data[0]['jogo']
  }
}

function save(object) {
  DbInstance.collection('data').deleteMany().then(() => {
    DbInstance.collection('data').insertOne(object).then(() => {
      console.log('object data saved')
    })
  })
}

module.exports = {
  getDataFromMongo,
  save,
  connect,
  DbInstance: () => {return DbInstance}
}
