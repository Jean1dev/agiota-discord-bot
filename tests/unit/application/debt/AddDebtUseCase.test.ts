import { AddDebtUseCase } from '../../../../src/application/debt/AddDebtUseCase'
import { IDebtRepository } from '../../../../src/domain/debt/IDebtRepository'
import { DebtUser } from '../../../../src/domain/debt/DebtUser'

// ── Stub simples em memória ──────────────────────────────────────────────

class InMemoryDebtRepository implements IDebtRepository {
  private store = new Map<string, DebtUser>()

  async findAll(): Promise<DebtUser[]> {
    return Array.from(this.store.values())
  }

  async findById(userId: string): Promise<DebtUser | null> {
    return this.store.get(userId) ?? null
  }

  async save(user: DebtUser): Promise<void> {
    this.store.set(user.userId, user)
  }

  async saveAll(users: DebtUser[]): Promise<void> {
    this.store.clear()
    for (const u of users) this.store.set(u.userId, u)
  }
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('AddDebtUseCase', () => {
  let repo: InMemoryDebtRepository
  let useCase: AddDebtUseCase

  beforeEach(() => {
    repo = new InMemoryDebtRepository()
    useCase = new AddDebtUseCase(repo)
  })

  it('cria um novo usuário e adiciona a dívida', async () => {
    const result = await useCase.execute({
      userId: '<@111>',
      value: 100,
      description: 'Almoço',
      lender: 'Jean',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.totalOwed).toBe(100)
    expect(result.value.userId).toBe('<@111>')
  })

  it('acumula dívida em usuário existente', async () => {
    await useCase.execute({ userId: '<@111>', value: 100, description: 'A', lender: 'Jean' })
    const result = await useCase.execute({ userId: '<@111>', value: 50, description: 'B', lender: 'Jean' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.totalOwed).toBe(150)
  })

  it('persiste no repositório', async () => {
    await useCase.execute({ userId: '<@222>', value: 75, description: 'X', lender: 'Jean' })

    const saved = await repo.findById('<@222>')
    expect(saved).not.toBeNull()
    expect(saved?.totalOwed).toBe(75)
  })

  it('retorna erro para valor zero', async () => {
    const result = await useCase.execute({
      userId: '<@333>',
      value: 0,
      description: 'X',
      lender: 'Jean',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch('Valor da dívida deve ser maior que zero')
  })

  it('retorna erro para valor negativo', async () => {
    const result = await useCase.execute({
      userId: '<@333>',
      value: -50,
      description: 'X',
      lender: 'Jean',
    })

    expect(result.ok).toBe(false)
  })
})
