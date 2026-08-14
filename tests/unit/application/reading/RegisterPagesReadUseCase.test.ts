import { RegisterPagesReadUseCase } from '../../../../src/application/reading/RegisterPagesReadUseCase'
import { AddDailyGoalUseCase } from '../../../../src/application/reading/AddDailyGoalUseCase'
import { IReadingRepository } from '../../../../src/domain/reading/IReadingRepository'
import { ReadingTracker } from '../../../../src/domain/reading/ReadingTracker'

// ── Stub simples em memória ──────────────────────────────────────────────

class InMemoryReadingRepository implements IReadingRepository {
  private tracker: ReadingTracker = new ReadingTracker([], [])

  async get(): Promise<ReadingTracker> {
    return this.tracker
  }

  async save(tracker: ReadingTracker): Promise<void> {
    this.tracker = tracker
  }
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('RegisterPagesReadUseCase', () => {
  let repo: InMemoryReadingRepository
  let useCase: RegisterPagesReadUseCase

  beforeEach(() => {
    repo = new InMemoryReadingRepository()
    useCase = new RegisterPagesReadUseCase(repo)
  })

  it('registra páginas lidas e abate do débito', async () => {
    await new AddDailyGoalUseCase(repo).execute(15)
    const result = await useCase.execute({ pages: 10 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pagesDebt).toBe(5)
  })

  it('exemplo do enunciado: débito de 15, lê 10, sobra 5', async () => {
    await new AddDailyGoalUseCase(repo).execute(15)
    const result = await useCase.execute({ pages: 10 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pagesDebt).toBe(5)
  })

  it('permite crédito quando lê mais do que deve', async () => {
    await new AddDailyGoalUseCase(repo).execute(5)
    const result = await useCase.execute({ pages: 8 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pagesDebt).toBe(-3)
    expect(result.value.hasDebt).toBe(false)
  })

  it('persiste no repositório', async () => {
    await new AddDailyGoalUseCase(repo).execute(10)
    await useCase.execute({ pages: 4 })

    const saved = await repo.get()
    expect(saved.pagesDebt).toBe(6)
  })

  it('retorna erro para valor zero', async () => {
    const result = await useCase.execute({ pages: 0 })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch('Quantidade de páginas lidas deve ser maior que zero')
  })

  it('retorna erro para valor negativo', async () => {
    const result = await useCase.execute({ pages: -5 })
    expect(result.ok).toBe(false)
  })
})
