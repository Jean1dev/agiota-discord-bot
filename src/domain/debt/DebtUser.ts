import { Debt, Payment } from './Debt'

/**
 * Agregado que representa um usuário com suas dívidas e pagamentos.
 * Imutável — todas as operações retornam uma nova instância.
 *
 * O `userId` usa o formato de menção do Discord (<@123456789>)
 * para manter compatibilidade com os dados existentes no MongoDB.
 */
export class DebtUser {
  constructor(
    readonly userId: string,
    private readonly _debts: ReadonlyArray<Debt>,
    private readonly _payments: ReadonlyArray<Payment>,
  ) {
    if (!userId.trim()) throw new Error('userId é obrigatório')
  }

  get debts(): ReadonlyArray<Debt> {
    return this._debts
  }

  get payments(): ReadonlyArray<Payment> {
    return this._payments
  }

  get totalDebts(): number {
    return this._debts.reduce((sum, d) => sum + d.value, 0)
  }

  get totalPaid(): number {
    return this._payments.reduce((sum, p) => sum + p.value, 0)
  }

  /**
   * Saldo devedor líquido. Positivo = ainda deve; zero/negativo = quitado.
   */
  get totalOwed(): number {
    return this.totalDebts - this.totalPaid
  }

  get hasActiveDebt(): boolean {
    return this.totalOwed > 0
  }

  /**
   * Adiciona uma nova dívida e retorna um novo DebtUser.
   */
  addDebt(value: number, description: string, lender: string): DebtUser {
    const debt = Debt.create(value, description, lender)
    return new DebtUser(this.userId, [...this._debts, debt], this._payments)
  }

  /**
   * Registra um pagamento e retorna um novo DebtUser.
   */
  recordPayment(value: number): DebtUser {
    if (value <= 0) throw new Error('Valor do pagamento deve ser maior que zero')
    const payment = Payment.create(value)
    return new DebtUser(this.userId, this._debts, [...this._payments, payment])
  }
}
