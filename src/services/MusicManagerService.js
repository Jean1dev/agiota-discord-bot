const { DbInstance: MongoClient } = require('../repository/mongodb')

const MUSIC_COLLECTION = 'songs'

function addMusic(urlMusic) {
    MongoClient()
        .collection(MUSIC_COLLECTION)
        .insertOne({ urlMusic })
        .then((out) => console.log(`music inserted`, out))
}

async function ramdomMusic() {
    const data = await MongoClient().collection(MUSIC_COLLECTION).find({}).toArray()
    if (data.length === 0) {
        return ''
    }

    const indiceAleatorio = Math.floor(Math.random() * data.length);
    console.log(data[indiceAleatorio])
    return data[indiceAleatorio].urlMusic;
}


module.exports = {
    addMusic,
    ramdomMusic
}