import { IDebtRepository } from '../../domain/debt/IDebtRepository'
import { DebtUser } from '../../domain/debt/DebtUser'
import { Debt, Payment } from '../../domain/debt/Debt'
import { MongoConnection } from './MongoConnection'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('MongoDebtRepository')

// ── Tipos que espelham o schema atual no MongoDB ───────────────────────────

interface StoredDebt {
  data: Date | string
  valor: string | number
  descricao: string
  quemEmprestouDinheiro: string
}

interface StoredPayment {
  valorPago: string | number
  data: Date | string
}

interface StoredDebtUser {
  id: string
  pendencias: StoredDebt[]
  pagamentos: StoredPayment[]
}

interface DataDocument {
  dividas?: StoredDebtUser[]
  jogoAberto?: boolean
  jogo?: unknown
  totalGastoCartao?: number
  autoArbitragem?: boolean
}

const COLLECTION = 'data'

// ── Mapeamento entre schema armazenado e domain model ──────────────────────

function toDomain(stored: StoredDebtUser): DebtUser {
  const debts = (stored.pendencias ?? []).map((p, i) =>
    Debt.reconstitute({
      id: `legacy-debt-${stored.id}-${i}`,
      value: Number(p.valor),
      description: p.descricao ?? '',
      lender: p.quemEmprestouDinheiro ?? '',
      createdAt: p.data ? new Date(p.data) : new Date(),
    })
  )

  const payments = (stored.pagamentos ?? []).map((p, i) =>
    Payment.reconstitute({
      id: `legacy-payment-${stored.id}-${i}`,
      value: Number(p.valorPago),
      createdAt: p.data ? new Date(p.data) : new Date(),
    })
  )

  return new DebtUser(stored.id, debts, payments)
}

function toStored(user: DebtUser): StoredDebtUser {
  return {
    id: user.userId,
    pendencias: user.debts.map(d => ({
      data: d.createdAt,
      valor: d.value,
      descricao: d.description,
      quemEmprestouDinheiro: d.lender,
    })),
    pagamentos: user.payments.map(p => ({
      valorPago: p.value,
      data: p.createdAt,
    })),
  }
}

// ── Repositório ────────────────────────────────────────────────────────────

export class MongoDebtRepository implements IDebtRepository {
  private collection() {
    return MongoConnection.getCollection<DataDocument>(COLLECTION)
  }

  private async loadDocument(): Promise<DataDocument> {
    const docs = await this.collection().find({}).toArray()
    return docs[0] ?? {}
  }

  /**
   * Atualiza apenas o campo `dividas` do documento de estado,
   * preservando jogoAberto, jogo, totalGastoCartao e autoArbitragem.
   */
  private async persistDividas(users: DebtUser[]): Promise<void> {
    const stored = users.map(toStored)
    await this.collection().updateOne(
      {},
      { $set: { dividas: stored } },
      { upsert: true },
    )
    log.debug({ count: users.length }, 'dividas persistidas')
  }

  async findAll(): Promise<DebtUser[]> {
    const doc = await this.loadDocument()
    return (doc.dividas ?? []).map(toDomain)
  }

  async findById(userId: string): Promise<DebtUser | null> {
    const all = await this.findAll()
    return all.find(u => u.userId === userId) ?? null
  }

  async save(user: DebtUser): Promise<void> {
    const all = await this.findAll()
    const idx = all.findIndex(u => u.userId === user.userId)
    const updated = idx >= 0
      ? all.map((u, i) => (i === idx ? user : u))
      : [...all, user]
    await this.persistDividas(updated)
  }

  async saveAll(users: DebtUser[]): Promise<void> {
    await this.persistDividas(users)
  }
}
