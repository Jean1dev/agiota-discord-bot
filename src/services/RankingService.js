const { DbInstance: MongoClient } = require('../repository/mongodb')
const { ObjectID } = require('mongodb')

const COLLECTION_NAME = 'ranking'

class RankingService {

    async criarOuAtualizarRanking(data) {
        const entity = await MongoClient().collection(COLLECTION_NAME).findOne({ userId: data.userId })
        if (!entity) {
            await MongoClient().collection(COLLECTION_NAME).insertOne({
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

        await MongoClient().collection(COLLECTION_NAME).updateOne({ _id: new ObjectID(entity._id) }, { $set: { pontuacao: entity.pontuacao } })
    }

    async listagem() {
        const data = await MongoClient().collection(COLLECTION_NAME).find({}).toArray()
        return data
    }
}

module.exports = new RankingService()