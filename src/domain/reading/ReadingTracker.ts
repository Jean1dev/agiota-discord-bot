import { DailyGoal, PagesRead } from './ReadingEntry'

/**
 * Agregado que representa o débito de páginas de leitura do dia a dia.
 * Imutável — todas as operações retornam uma nova instância.
 *
 * A cada dia uma meta é somada ao débito (ex: 5 páginas); ao registrar
 * páginas lidas, o valor é abatido do débito. Débito negativo significa
 * crédito — o usuário leu além da meta acumulada.
 */
export class ReadingTracker {
  constructor(
    private readonly _goals: ReadonlyArray<DailyGoal>,
    private readonly _readings: ReadonlyArray<PagesRead>,
  ) {}

  get goals(): ReadonlyArray<DailyGoal> {
    return this._goals
  }

  get readings(): ReadonlyArray<PagesRead> {
    return this._readings
  }

  get totalGoal(): number {
    return this._goals.reduce((sum, g) => sum + g.pages, 0)
  }

  get totalRead(): number {
    return this._readings.reduce((sum, r) => sum + r.pages, 0)
  }

  /**
   * Débito atual de páginas. Positivo = ainda deve ler; zero/negativo = em dia (ou com crédito).
   */
  get pagesDebt(): number {
    return this.totalGoal - this.totalRead
  }

  get hasDebt(): boolean {
    return this.pagesDebt > 0
  }

  /**
   * Adiciona a meta diária de páginas ao débito e retorna um novo ReadingTracker.
   */
  addDailyGoal(pages: number): ReadingTracker {
    const goal = DailyGoal.create(pages)
    return new ReadingTracker([...this._goals, goal], this._readings)
  }

  /**
   * Registra páginas lidas, abatendo do débito, e retorna um novo ReadingTracker.
   */
  registerPagesRead(pages: number): ReadingTracker {
    const reading = PagesRead.create(pages)
    return new ReadingTracker(this._goals, [...this._readings, reading])
  }
}
