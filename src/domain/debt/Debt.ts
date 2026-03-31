import { randomUUID } from 'crypto'

export interface DebtProps {
  readonly id: string
  readonly value: number
  readonly description: string
  readonly lender: string
  readonly createdAt: Date
}

/**
 * Representa uma dívida individual — imutável após criação.
 */
export class Debt {
  readonly id: string
  readonly value: number
  readonly description: string
  readonly lender: string
  readonly createdAt: Date

  private constructor(props: DebtProps) {
    this.id = props.id
    this.value = props.value
    this.description = props.description
    this.lender = props.lender
    this.createdAt = props.createdAt
  }

  static create(value: number, description: string, lender: string): Debt {
    if (value <= 0) throw new Error('Valor da dívida deve ser maior que zero')
    if (!lender.trim()) throw new Error('Nome do credor é obrigatório')

    return new Debt({
      id: randomUUID(),
      value,
      description: description.trim(),
      lender: lender.trim(),
      createdAt: new Date(),
    })
  }

  /** Reconstrói uma dívida a partir de dados persistidos (sem validação de negócio). */
  static reconstitute(props: DebtProps): Debt {
    return new Debt(props)
  }
}

export interface PaymentProps {
  readonly id: string
  readonly value: number
  readonly createdAt: Date
}

/**
 * Representa um pagamento realizado — imutável após criação.
 */
export class Payment {
  readonly id: string
  readonly value: number
  readonly createdAt: Date

  private constructor(props: PaymentProps) {
    this.id = props.id
    this.value = props.value
    this.createdAt = props.createdAt
  }

  static create(value: number): Payment {
    if (value <= 0) throw new Error('Valor do pagamento deve ser maior que zero')

    return new Payment({ id: randomUUID(), value, createdAt: new Date() })
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props)
  }
}
