import { IDebtRepository } from '../../domain/debt/IDebtRepository'
import { DebtUser } from '../../domain/debt/DebtUser'
import { Result } from '../../domain/shared/Result'

export interface PayDebtDto {
  /** Discord mention format, ex: <@123456789>  */
  userId: string
  value: number
}

export class PayDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(dto: PayDebtDto): Promise<Result<DebtUser>> {
    return Result.fromAsync(async () => {
      const user = await this.debtRepo.findById(dto.userId)

      if (!user) {
        throw new Error(`Nenhuma dívida encontrada para o usuário ${dto.userId}`)
      }

      if (!user.hasActiveDebt) {
        throw new Error(`O usuário ${dto.userId} não possui dívidas em aberto`)
      }

      const updated = user.recordPayment(dto.value)
      await this.debtRepo.save(updated)
      return updated
    })
  }
}
