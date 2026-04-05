import { PayDebtUseCase } from '../../../../src/application/debt/PayDebtUseCase'
import { AddDebtUseCase } from '../../../../src/application/debt/AddDebtUseCase'
import { IDebtRepository } from '../../../../src/domain/debt/IDebtRepository'
import { DebtUser } from '../../../../src/domain/debt/DebtUser'

class InMemoryDebtRepository implements IDebtRepository {
  private store = new Map<string, DebtUser>()

  async findAll() { return Array.from(this.store.values()) }
  async findById(id: string) { return this.store.get(id) ?? null }
  async save(user: DebtUser) { this.store.set(user.userId, user) }
  async saveAll(users: DebtUser[]) {
    this.store.clear()
    users.forEach(u => this.store.set(u.userId, u))
  }
}

describe('PayDebtUseCase', () => {
  let repo: InMemoryDebtRepository
  let payUseCase: PayDebtUseCase
  let addUseCase: AddDebtUseCase

  beforeEach(async () => {
    repo = new InMemoryDebtRepository()
    payUseCase = new PayDebtUseCase(repo)
    addUseCase = new AddDebtUseCase(repo)
    // Cria uma dívida pré-existente
    await addUseCase.execute({ userId: '<@111>', value: 100, description: 'Teste', lender: 'Jean' })
  })

  it('reduz o saldo devedor', async () => {
    const result = await payUseCase.execute({ userId: '<@111>', value: 40 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.totalOwed).toBe(60)
  })

  it('zera a dívida com pagamento exato', async () => {
    const result = await payUseCase.execute({ userId: '<@111>', value: 100 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.hasActiveDebt).toBe(false)
  })

  it('persiste o pagamento no repositório', async () => {
    await payUseCase.execute({ userId: '<@111>', value: 60 })

    const saved = await repo.findById('<@111>')
    expect(saved?.totalPaid).toBe(60)
    expect(saved?.totalOwed).toBe(40)
  })

  it('retorna erro se usuário não existe', async () => {
    const result = await payUseCase.execute({ userId: '<@999>', value: 50 })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch('<@999>')
  })

  it('retorna erro se usuário não tem dívida em aberto', async () => {
    // Quita a dívida primeiro
    await payUseCase.execute({ userId: '<@111>', value: 100 })

    const result = await payUseCase.execute({ userId: '<@111>', value: 10 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch('não possui dívidas em aberto')
  })

  it('retorna erro para valor negativo', async () => {
    const result = await payUseCase.execute({ userId: '<@111>', value: -10 })
    expect(result.ok).toBe(false)
  })
})
