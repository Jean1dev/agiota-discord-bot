import { analyzeMerchantReceipt } from '../../../src/services/finance/MerchantReceiptService'
import { registerDailyBudgetHandlers } from '../../../src/telegram/handlers/DailyBudgetHandler'

jest.mock('telegraf', () => ({
  Markup: { keyboard: () => ({ resize: () => ({}) }) },
}))
jest.mock('telegraf/filters', () => ({ message: (type: string) => type }))
jest.mock('../../../src/telegram/TelegramConfig', () => ({
  KEYBOARDS: { dailyBudget: { keyboard: [] } },
}))
jest.mock('../../../src/services/finance/DailyBudgetService', () => ({
  batchInsert: jest.fn(),
  getMyDailyBudget: jest.fn(),
  spentMoney: jest.fn(),
}))
jest.mock('../../../src/services/finance/CurrencyService', () => ({
  resolveMoneyToBrl: jest.fn(),
}))
jest.mock('../../../src/services/finance/BankNotificationImageService', () => ({
  extractTransactionsFromImage: jest.fn(),
}))
jest.mock('../../../src/services/finance/MerchantReceiptService', () => ({
  analyzeMerchantReceipt: jest.fn(),
}))
jest.mock('../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}))

const mockedAnalyzeMerchantReceipt = jest.mocked(analyzeMerchantReceipt)

describe('DailyBudgetHandler - cupom com múltiplas imagens', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('agrupa o álbum e envia as URLs em ordem em uma única chamada', async () => {
    const hearsHandlers = new Map<string, (ctx: unknown) => unknown>()
    const onHandlers = new Map<string, (ctx: unknown) => unknown>()
    const bot = {
      start: jest.fn(),
      hears: jest.fn((event: string | string[], handler: (ctx: unknown) => unknown) => {
        if (typeof event === 'string') hearsHandlers.set(event, handler)
      }),
      on: jest.fn((event: string, handler: (ctx: unknown) => unknown) => {
        onHandlers.set(event, handler)
      }),
    }
    registerDailyBudgetHandlers(bot)

    const reply = jest.fn().mockResolvedValue(undefined)
    const getFileLink = jest.fn((fileId: string) =>
      Promise.resolve(new URL(`https://telegram.example/${fileId}.jpg`)),
    )
    mockedAnalyzeMerchantReceipt.mockResolvedValue({ success: true })

    await hearsHandlers.get('adicionar cupom mercado')?.({ reply })
    const photoHandler = onHandlers.get('photo')
    await photoHandler?.({
      update: {
        message: {
          message_id: 20,
          media_group_id: 'album-1',
          photo: [{ file_id: 'second-small' }, { file_id: 'second' }],
        },
      },
      telegram: { getFileLink },
      reply,
    })
    await photoHandler?.({
      update: {
        message: {
          message_id: 10,
          media_group_id: 'album-1',
          photo: [{ file_id: 'first-small' }, { file_id: 'first' }],
        },
      },
      telegram: { getFileLink },
      reply,
    })

    await jest.advanceTimersByTimeAsync(1_000)

    expect(getFileLink.mock.calls).toEqual([['first'], ['second']])
    expect(mockedAnalyzeMerchantReceipt).toHaveBeenCalledTimes(1)
    expect(mockedAnalyzeMerchantReceipt).toHaveBeenCalledWith([
      'https://telegram.example/first.jpg',
      'https://telegram.example/second.jpg',
    ])
  })
})
