import { IDebtRepository } from '../../domain/debt/IDebtRepository'
import { DebtUser } from '../../domain/debt/DebtUser'
import { Result } from '../../domain/shared/Result'

export class ListDebtsUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  /** Retorna apenas os usuários que ainda têm saldo devedor positivo. */
  async execute(): Promise<Result<DebtUser[]>> {
    return Result.fromAsync(async () => {
      const all = await this.debtRepo.findAll()
      return all.filter(u => u.hasActiveDebt)
    })
  }
}
