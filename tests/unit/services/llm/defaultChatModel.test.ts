jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

const save = jest.fn()
const ctx = {
  defaultChatModel: null as string | null,
  save,
}

jest.mock('../../../../src/context', () => ({
  contextInstance: () => ctx,
}))

describe('defaultChatModel', () => {
  beforeEach(() => {
    jest.resetModules()
    ctx.defaultChatModel = null
    save.mockClear()
  })

  it('usa fallback quando contexto nao tem modelo', () => {
    const { getDefaultChatModel } = require('../../../../src/services/llm/defaultChatModel')
    const { FALLBACK_CHAT_MODEL } = require('../../../../src/services/llm/constants')
    expect(getDefaultChatModel()).toBe(FALLBACK_CHAT_MODEL)
  })

  it('respeita modelo persistido no contexto', () => {
    ctx.defaultChatModel = 'openai/gpt-4o-mini'
    const { getDefaultChatModel } = require('../../../../src/services/llm/defaultChatModel')
    expect(getDefaultChatModel()).toBe('openai/gpt-4o-mini')
  })

  it('persiste novo modelo via setDefaultChatModel', () => {
    const { setDefaultChatModel } = require('../../../../src/services/llm/defaultChatModel')
    setDefaultChatModel('anthropic/claude-3')
    expect(ctx.defaultChatModel).toBe('anthropic/claude-3')
    expect(save).toHaveBeenCalled()
  })
})
