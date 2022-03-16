const URI = process.env.MONGO_URL
const DATABASE = 'agiobot'
const MongoClient = require('mongodb').MongoClient
const client = new MongoClient(URI, { useNewUrlParser: true, useUnifiedTopology: true })

async function getDataFromMongo() {
  try {
    await client.connect()
    const data = await client.db(DATABASE).collection('data').find().toArray()
    console.log("Carregou os dados do bd")
    if (!data.length) {
      return {
        dividas: [],
        acoes: [],
        jogoAberto: false,
        jogo: null
      }
    }

    return {
      dividas: data[0]['dividas'],
      acoes: data[0]['acoes'],
      jogoAberto: data[0]['jogoAberto'],
      jogo: data[0]['jogo']
    }

  } finally {
    await client.close()
  }
}

function save(object) {
  client.connect().then(client => {
    client.db(DATABASE).collection('data').deleteMany().then(() => {
      client.db(DATABASE).collection('data').insertOne(object).then(() => {
        console.log('OK')
        client.close().then(() => console.log('conexao fechada'))
      })
    })
  })
}

module.exports = {
  getDataFromMongo,
  save,
  client,
  DATABASE
}
