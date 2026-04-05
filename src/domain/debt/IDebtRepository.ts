import { DebtUser } from './DebtUser'

/**
 * Contrato do repositório de dívidas.
 * Use cases dependem desta interface, não da implementação concreta.
 */
export interface IDebtRepository {
  /** Retorna todos os usuários que têm dívidas registradas. */
  findAll(): Promise<DebtUser[]>

  /** Retorna um usuário pelo userId (Discord mention format). */
  findById(userId: string): Promise<DebtUser | null>

  /** Persiste o estado de um usuário (insert ou update). */
  save(user: DebtUser): Promise<void>

  /** Substitui toda a lista de usuários de uma vez. */
  saveAll(users: DebtUser[]): Promise<void>
}
