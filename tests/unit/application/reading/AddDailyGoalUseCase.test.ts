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

describe('AddDailyGoalUseCase', () => {
  let repo: InMemoryReadingRepository
  let useCase: AddDailyGoalUseCase

  beforeEach(() => {
    repo = new InMemoryReadingRepository()
    useCase = new AddDailyGoalUseCase(repo)
  })

  it('adiciona a meta diária ao débito', async () => {
    const result = await useCase.execute(5)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pagesDebt).toBe(5)
  })

  it('acumula metas em execuções sucessivas', async () => {
    await useCase.execute(5)
    const result = await useCase.execute(5)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pagesDebt).toBe(10)
  })

  it('persiste no repositório', async () => {
    await useCase.execute(7)

    const saved = await repo.get()
    expect(saved.pagesDebt).toBe(7)
  })

  it('retorna erro para valor zero', async () => {
    const result = await useCase.execute(0)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch('Quantidade de páginas da meta deve ser maior que zero')
  })

  it('retorna erro para valor negativo', async () => {
    const result = await useCase.execute(-5)
    expect(result.ok).toBe(false)
  })
})
