import { ModeloCommand } from '../../../../../src/discord/commands/ai/ModeloCommand'

jest.mock('../../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

jest.mock('../../../../../src/services/llm/LiteLlmClient', () => ({
  isLiteLlmConfigured: jest.fn(),
  listModels: jest.fn(),
}))

jest.mock('../../../../../src/services/llm/defaultChatModel', () => ({
  getDefaultChatModel: jest.fn(() => 'openai/gpt-4o'),
  setDefaultChatModel: jest.fn(),
}))

const { isLiteLlmConfigured, listModels } = require('../../../../../src/services/llm/LiteLlmClient')
const { getDefaultChatModel, setDefaultChatModel } = require('../../../../../src/services/llm/defaultChatModel')

function createMessage(overrides: Partial<{ content: string; reply: jest.Mock; send: jest.Mock; awaitMessages: jest.Mock }> = {}) {
  const reply = overrides.reply ?? jest.fn().mockResolvedValue(undefined)
  const send = overrides.send ?? jest.fn().mockResolvedValue(undefined)
  const awaitMessages = overrides.awaitMessages ?? jest.fn()
  return {
    author: { id: 'user-1', username: 'u', send: jest.fn() },
    content: overrides.content ?? '$modelo',
    reply,
    channel: { send, awaitMessages },
  }
}

describe('ModeloCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    isLiteLlmConfigured.mockReturnValue(true)
    listModels.mockResolvedValue([
      { id: 'openai/gpt-4o', mode: 'chat' },
      { id: 'openai/dall-e-3', mode: 'image_generation' },
    ])
  })

  it('mostra modelo atual sem iniciar selecao', async () => {
    const message = createMessage()
    const cmd = new ModeloCommand()
    await cmd.execute({ message: message as any, args: ['atual'] })
    expect(getDefaultChatModel).toHaveBeenCalled()
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('openai/gpt-4o'))
    expect(listModels).not.toHaveBeenCalled()
  })

  it('atualiza modelo quando numero valido', async () => {
    const message = createMessage({
      awaitMessages: jest.fn().mockResolvedValue({
        first: () => ({ content: '1' }),
      }),
    })
    const cmd = new ModeloCommand()
    await cmd.execute({ message: message as any, args: [] })
    expect(setDefaultChatModel).toHaveBeenCalledWith('openai/gpt-4o')
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('openai/gpt-4o'))
  })

  it('mantem default quando selecao invalida', async () => {
    const message = createMessage({
      awaitMessages: jest.fn().mockResolvedValue({
        first: () => ({ content: '99' }),
      }),
    })
    const cmd = new ModeloCommand()
    await cmd.execute({ message: message as any, args: [] })
    expect(setDefaultChatModel).not.toHaveBeenCalled()
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('inválida'))
  })

  it('informa timeout sem alterar default', async () => {
    const message = createMessage({
      awaitMessages: jest.fn().mockRejectedValue(new Error('time')),
    })
    const cmd = new ModeloCommand()
    await cmd.execute({ message: message as any, args: [] })
    expect(setDefaultChatModel).not.toHaveBeenCalled()
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('Tempo esgotado'))
  })
})
