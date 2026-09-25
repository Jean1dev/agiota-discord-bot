import type { Context } from 'telegraf'
import { registerPublicHandlers } from '../../../src/telegram/handlers/PublicHandler'
import { getSubscriptionByEmailAllTenants } from '../../../src/services/subscription/SubscriptionValidator'
import { MongoConnection } from '../../../src/infrastructure/database/MongoConnection'
import { enviarMensagemParaMim } from '../../../src/telegram/TelegramUtils'
import { sendProductLinks } from '../../../src/telegram/ProductLinks'

jest.mock('../../../src/services/subscription/SubscriptionValidator', () => ({
  getSubscriptionByEmailAllTenants: jest.fn(),
}))
jest.mock('../../../src/infrastructure/database/MongoConnection', () => ({
  MongoConnection: { getDb: jest.fn() },
}))
jest.mock('../../../src/telegram/TelegramUtils', () => ({
  enviarMensagemParaMim: jest.fn(),
  enviarMensagemParaUsuario: jest.fn(),
}))
jest.mock('../../../src/telegram/TelegramConfig', () => ({
  KEYBOARDS: { publicUser: { keyboard: [] } },
  SUBSCRIPTION_PURCHASE_URL: 'https://example.com/purchase',
}))
jest.mock('../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ error: jest.fn(), info: jest.fn() }),
}))

const lookup = jest.mocked(getSubscriptionByEmailAllTenants)
const collection = {
  findOne: jest.fn().mockResolvedValue(null),
  insertOne: jest.fn().mockResolvedValue({}),
  updateOne: jest.fn().mockResolvedValue({}),
}
let userId = 100

async function startConversation() {
  let onMessage!: (ctx: Context) => Promise<void>
  const bot = {
    start: jest.fn(), help: jest.fn(), hears: jest.fn(),
    on: jest.fn((_event: string, handler: typeof onMessage) => { onMessage = handler }),
  }
  registerPublicHandlers(bot)
  const ctx = {
    update: { message: { from: { id: ++userId, first_name: 'Visitante' }, text: 'Olá' } },
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithMarkdownV2: jest.fn().mockResolvedValue(undefined),
  }
  const send = async (text: string) => {
    ctx.update.message.text = text
    await onMessage(ctx as unknown as Context)
  }
  await send('Olá')
  jest.mocked(enviarMensagemParaMim).mockClear()
  ctx.reply.mockClear()
  return { ctx, send }
}

describe('PublicHandler - vinculação de email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(MongoConnection.getDb).mockReturnValue({
      collection: () => collection,
    } as unknown as ReturnType<typeof MongoConnection.getDb>)
  })

  it('envia os links do produto e mantém o aviso ao administrador quando não encontra email', async () => {
    lookup.mockResolvedValue({ found: false })
    const { ctx, send } = await startConversation()
    await send('visitante@example.com')

    expect(ctx.reply).toHaveBeenLastCalledWith(expect.stringContaining('Verifique se o email está correto.'))
    const linksReply = jest.fn().mockResolvedValue(undefined)
    await sendProductLinks({ replyWithMarkdownV2: linksReply } as unknown as Context)
    expect(ctx.replyWithMarkdownV2.mock.calls).toEqual(linksReply.mock.calls)
    expect(ctx.replyWithMarkdownV2).toHaveBeenCalledTimes(1)
    expect(enviarMensagemParaMim).toHaveBeenCalledWith(expect.stringContaining('Usuário tentou vincular email não encontrado:'))
    expect(collection.updateOne).not.toHaveBeenCalled()

    await send('outro@example.com')
    expect(lookup).toHaveBeenLastCalledWith('outro@example.com')
  })

  it('solicita correção de email inválido sem consultar ou enviar links', async () => {
    const { ctx, send } = await startConversation()
    await send('email-invalido')
    expect(ctx.reply).toHaveBeenCalledWith('❌ Email inválido. Por favor, envie um email válido:')
    expect(lookup).not.toHaveBeenCalled()
    expect(ctx.replyWithMarkdownV2).not.toHaveBeenCalled()
    expect(enviarMensagemParaMim).not.toHaveBeenCalled()
  })

  it('vincula assinatura encontrada sem enviar links do produto', async () => {
    lookup.mockResolvedValue({ found: true, email: 'cliente@example.com', vigenteAte: '2099-12-31', isActive: true })
    const { ctx, send } = await startConversation()
    await send('cliente@example.com')
    expect(collection.updateOne).toHaveBeenCalledWith(
      { userId: ctx.update.message.from.id },
      { $set: expect.objectContaining({ email: 'cliente@example.com', isActive: true }) },
    )
    expect(ctx.reply).toHaveBeenLastCalledWith(expect.stringContaining('Assinatura encontrada!'))
    expect(ctx.replyWithMarkdownV2).not.toHaveBeenCalled()
    expect(enviarMensagemParaMim).toHaveBeenCalledWith(expect.stringContaining('Usuário vinculou assinatura:'))
  })

  it('informa falha de consulta sem links ou aviso de email inexistente e permite tentar novamente', async () => {
    lookup.mockResolvedValue({ found: false, error: 'Serviço indisponível' })
    const { ctx, send } = await startConversation()
    await send('visitante@example.com')
    expect(ctx.reply).toHaveBeenLastCalledWith(expect.stringContaining('tente novamente enviando seu email'))
    expect(ctx.replyWithMarkdownV2).not.toHaveBeenCalled()
    expect(enviarMensagemParaMim).not.toHaveBeenCalled()
    expect(collection.updateOne).not.toHaveBeenCalled()

    lookup.mockResolvedValue({ found: false })
    await send('visitante@example.com')
    expect(ctx.replyWithMarkdownV2).toHaveBeenCalledTimes(1)
  })
})
