jest.mock('openai', () => {
  return jest.fn().mockImplementation((opts: { apiKey: string; baseURL: string }) => ({
    __opts: opts,
    models: {
      list: jest.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { id: 'openai/gpt-4o', mode: 'chat' }
        },
      }),
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'ok' } }],
        }),
      },
    },
  }))
})

jest.mock('../../../../src/config/env', () => ({
  env: {
    LITELLM_BASE_URL: 'https://example.up.railway.app/v1',
    LITELLM_API_KEY: 'sk-test',
  },
}))

jest.mock('../../../../src/services/llm/defaultChatModel', () => ({
  getDefaultChatModel: () => 'openai/gpt-4o',
}))

describe('LiteLlmClient', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('cria cliente com baseURL do gateway e lista modelos', async () => {
    const OpenAI = require('openai')
    const { getLiteLlmClient, listModels, resetLiteLlmClientForTests, textCompletion } =
      require('../../../../src/services/llm/LiteLlmClient')

    resetLiteLlmClientForTests()
    const client = getLiteLlmClient()
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://example.up.railway.app/v1',
    })
    expect((client as any).__opts.baseURL).not.toContain('api.openai.com')

    const models = await listModels()
    expect(models).toEqual([{ id: 'openai/gpt-4o', mode: 'chat' }])

    const completion = await textCompletion([{ role: 'user', content: 'hi' }])
    expect(completion.choices[0].message.content).toBe('ok')
  })
})
