import { DiscordMessage } from '../../../../../src/discord/commands/BaseCommand'
import { UpdateMonthlySpendingCommand } from '../../../../../src/discord/commands/admin/UpdateMonthlySpendingCommand'
import {
  getFoodSpending,
  getInterest,
  updateFoodSpending,
  updateInterest,
} from '../../../../../src/services/finance/OrganizzeService'
import { sendEmail } from '../../../../../src/services/email/EmailService'

jest.mock('../../../../../src/services/finance/OrganizzeService', () => ({
  getFoodSpending: jest.fn(),
  getInterest: jest.fn(),
  updateFoodSpending: jest.fn(),
  updateInterest: jest.fn(),
}))

jest.mock('../../../../../src/services/email/EmailService', () => ({
  sendEmail: jest.fn(),
}))

jest.mock('../../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}))

function makeMessage(): DiscordMessage & { replies: string[] } {
  const replies: string[] = []
  return {
    author: { id: `monthly-spending-${Date.now()}-${Math.random()}`, username: 'tester', send: async () => undefined },
    channel: { send: async () => undefined },
    reply: async (text: string) => { replies.push(text) },
    replies,
  }
}

const interestResponse = {
  interest_cents: 12345,
  interest_brl: 123.45,
  year: 2026,
  month: 7,
  items: [
    {
      id: 1,
      description: 'Cartao parcelado',
      date: '2026-07-10',
      amount_cents: -100000,
      interest_cents: 12345,
    },
  ],
}

const foodResponse = {
  total_cents: 67890,
  total_brl: 678.9,
  year: 2026,
  month: 7,
  items: [
    {
      id: 2,
      description: 'Mercado',
      date: '2026-07-11',
      amount_cents: -67890,
      category_id: 10,
    },
  ],
}

describe('UpdateMonthlySpendingCommand', () => {
  let command: UpdateMonthlySpendingCommand

  beforeEach(() => {
    jest.clearAllMocks()
    command = new UpdateMonthlySpendingCommand()

    jest.mocked(getInterest).mockResolvedValue(interestResponse)
    jest.mocked(updateInterest).mockResolvedValue({})
    jest.mocked(getFoodSpending).mockResolvedValue(foodResponse)
    jest.mocked(updateFoodSpending).mockResolvedValue({})
  })

  it('atualiza juros e alimentação e envia dois e-mails', async () => {
    const message = makeMessage()

    await command.execute({ message, args: [] })

    expect(getInterest).toHaveBeenCalledTimes(1)
    expect(updateInterest).toHaveBeenCalledWith(interestResponse)
    expect(getFoodSpending).toHaveBeenCalledTimes(1)
    expect(updateFoodSpending).toHaveBeenCalledWith(foodResponse)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    const subjects = jest.mocked(sendEmail).mock.calls.map(([payload]) => payload.subject)
    expect(subjects).toEqual(expect.arrayContaining([
      'Juros de julho/2026 atualizados',
      'Gastos com alimentação de julho/2026 atualizados',
    ]))
    expect(message.replies[0]).toBe('Buscando dados de juros e alimentação...')
    expect(message.replies[1]).toContain('Atualização de gastos finalizada (2/2 rotinas concluídas).')
    expect(message.replies[1]).toContain('Juros: atualizado (julho/2026) - R$ 123,45')
    expect(message.replies[1]).toContain('Alimentação: atualizada (julho/2026) - R$ 678,90')
  })

  it('continua alimentação quando juros falha', async () => {
    jest.mocked(getInterest).mockRejectedValue(new Error('interest failed'))
    const message = makeMessage()

    await command.execute({ message, args: [] })

    expect(updateInterest).not.toHaveBeenCalled()
    expect(getFoodSpending).toHaveBeenCalledTimes(1)
    expect(updateFoodSpending).toHaveBeenCalledWith(foodResponse)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(message.replies[1]).toContain('Atualização de gastos finalizada (1/2 rotinas concluídas).')
    expect(message.replies[1]).toContain('Juros: falhou ao atualizar. Detalhes nos logs.')
    expect(message.replies[1]).toContain('Alimentação: atualizada (julho/2026) - R$ 678,90')
  })

  it('continua juros quando alimentação falha', async () => {
    jest.mocked(getFoodSpending).mockRejectedValue(new Error('food failed'))
    const message = makeMessage()

    await command.execute({ message, args: [] })

    expect(updateInterest).toHaveBeenCalledWith(interestResponse)
    expect(updateFoodSpending).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(message.replies[1]).toContain('Atualização de gastos finalizada (1/2 rotinas concluídas).')
    expect(message.replies[1]).toContain('Juros: atualizado (julho/2026) - R$ 123,45')
    expect(message.replies[1]).toContain('Alimentação: falhou ao atualizar. Detalhes nos logs.')
  })
})
