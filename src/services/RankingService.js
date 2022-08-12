const { client: MongoClient, DATABASE } = require('../repository/mongodb')
const { ObjectID } = require('mongodb')

const COLLECTION_NAME = 'ranking'

class RankingService {

    async criarOuAtualizarRanking(data) {
        const client = await MongoClient.connect()
        const entity = await client.db(DATABASE).collection(COLLECTION_NAME).findOne({ userId: data.userId })
        if (!entity) {
            await client.db(DATABASE).collection(COLLECTION_NAME).insertOne({
                userId: data.userId,
                pontuacao: data.pontuacao
            })

            return
        }

        if (entity.operacao === 'SUBTRAIR') {
            entity.pontuacao = entity.pontuacao - data.pontuacao
        } else {
            entity.pontuacao = entity.pontuacao + data.pontuacao
        }

        await client.db(DATABASE).collection(COLLECTION_NAME).updateOne({ _id: new ObjectID(entity._id) }, { $set: { pontuacao: entity.pontuacao } })
        await client.close()
    }

    async listagem() {
        const client = await MongoClient.connect()
        const data = await client.db(DATABASE).collection(COLLECTION_NAME).find({}).toArray()
        await client.close()
        return data
    }
}

module.exports = new RankingService()