import { IDebtRepository } from '../../domain/debt/IDebtRepository'
import { DebtUser } from '../../domain/debt/DebtUser'
import { Result } from '../../domain/shared/Result'

export interface AddDebtDto {
  /** Discord mention format, ex: <@123456789> */
  userId: string
  value: number
  description: string
  /** Username de quem emprestou o dinheiro */
  lender: string
}

export class AddDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(dto: AddDebtDto): Promise<Result<DebtUser>> {
    return Result.fromAsync(async () => {
      const existing = await this.debtRepo.findById(dto.userId)
      const user = existing ?? new DebtUser(dto.userId, [], [])
      const updated = user.addDebt(dto.value, dto.description, dto.lender)
      await this.debtRepo.save(updated)
      return updated
    })
  }
}
