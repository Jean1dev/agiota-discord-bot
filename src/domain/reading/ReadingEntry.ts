import { randomUUID } from 'crypto'

export interface DailyGoalProps {
  readonly id: string
  readonly pages: number
  readonly createdAt: Date
}

/**
 * Representa a meta diária de páginas adicionada ao débito de leitura — imutável após criação.
 */
export class DailyGoal {
  readonly id: string
  readonly pages: number
  readonly createdAt: Date

  private constructor(props: DailyGoalProps) {
    this.id = props.id
    this.pages = props.pages
    this.createdAt = props.createdAt
  }

  static create(pages: number): DailyGoal {
    if (pages <= 0) throw new Error('Quantidade de páginas da meta deve ser maior que zero')

    return new DailyGoal({ id: randomUUID(), pages, createdAt: new Date() })
  }

  /** Reconstrói uma meta a partir de dados persistidos (sem validação de negócio). */
  static reconstitute(props: DailyGoalProps): DailyGoal {
    return new DailyGoal(props)
  }
}

export interface PagesReadProps {
  readonly id: string
  readonly pages: number
  readonly createdAt: Date
}

/**
 * Representa páginas lidas registradas pelo usuário — imutável após criação.
 */
export class PagesRead {
  readonly id: string
  readonly pages: number
  readonly createdAt: Date

  private constructor(props: PagesReadProps) {
    this.id = props.id
    this.pages = props.pages
    this.createdAt = props.createdAt
  }

  static create(pages: number): PagesRead {
    if (pages <= 0) throw new Error('Quantidade de páginas lidas deve ser maior que zero')

    return new PagesRead({ id: randomUUID(), pages, createdAt: new Date() })
  }

  static reconstitute(props: PagesReadProps): PagesRead {
    return new PagesRead(props)
  }
}
