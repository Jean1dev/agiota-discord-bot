import {
  filterChatModels,
  formatNumberedModelList,
  parseModelSelection,
  chunkLines,
} from '../../../../src/services/llm/modelCatalog'
import type { LiteLlmModel } from '../../../../src/services/llm/LiteLlmClient'

describe('modelCatalog', () => {
  const catalog: LiteLlmModel[] = [
    { id: 'openai/*', mode: 'chat' },
    { id: 'openai/gpt-4o', mode: 'chat' },
    { id: 'openai/dall-e-3', mode: 'image_generation' },
    { id: 'openai/tts-1', mode: 'audio_speech' },
    { id: 'anthropic/claude-3', mode: 'chat' },
    { id: 'mystery-model' },
  ]

  it('filtra apenas modelos de chat sem wildcards', () => {
    const filtered = filterChatModels(catalog)
    expect(filtered.map(m => m.id)).toEqual([
      'anthropic/claude-3',
      'mystery-model',
      'openai/gpt-4o',
    ])
  })

  it('numera e quebra lista longa em chunks', () => {
    const models = Array.from({ length: 5 }, (_, i) => ({ id: `m-${i}` }))
    const chunks = formatNumberedModelList(models)
    expect(chunks.join('\n')).toContain('1. m-0')
    expect(chunks.join('\n')).toContain('5. m-4')

    const long = chunkLines(['aaaa', 'bbbb'], 6)
    expect(long).toEqual(['aaaa', 'bbbb'])
  })

  it('parseia selecao numerica valida e invalida', () => {
    expect(parseModelSelection('2', 5)).toBe(2)
    expect(parseModelSelection('0', 5)).toBeNull()
    expect(parseModelSelection('6', 5)).toBeNull()
    expect(parseModelSelection('abc', 5)).toBeNull()
  })
})
