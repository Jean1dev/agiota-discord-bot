import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('RankingService')

const COLLECTION = 'ranking'

export interface RankingEntry {
  userId: string
  pontuacao: number
  operacao?: 'ADICIONAR' | 'SUBTRAIR'
}

class RankingService {
  async criarOuAtualizarRanking(data: RankingEntry): Promise<void> {
    const col = MongoConnection.getCollection<RankingEntry>(COLLECTION)
    const entity = await col.findOne({ userId: data.userId } as never)

    if (!entity) {
      await col.insertOne({ userId: data.userId, pontuacao: data.pontuacao } as never)
      return
    }

    const novaPontuacao = entity.operacao === 'SUBTRAIR'
      ? entity.pontuacao - data.pontuacao
      : entity.pontuacao + data.pontuacao

    await col.updateOne({ userId: data.userId } as never, { $set: { pontuacao: novaPontuacao } })
    log.info({ userId: data.userId, pontuacao: novaPontuacao }, 'ranking atualizado')
  }

  async listagem(): Promise<RankingEntry[]> {
    return MongoConnection.getCollection<RankingEntry>(COLLECTION).find({}).toArray()
  }
}

export const rankingService = new RankingService()
