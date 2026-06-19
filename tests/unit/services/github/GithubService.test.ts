/**
 * Regressão do GithubService.
 *
 * Antes usava `@octokit/core`, que arrasta o `node-fetch` (quebra com
 * ERR_STREAM_PREMATURE_CLOSE no Node 24) e, além disso, mandava placeholders
 * `OWNER`/`REPO` na query string. Agora usa `axios` (http nativo) com retry.
 */

jest.mock('../../../../src/config/env', () => ({
  env: { GITHUB_API_TOKEN: 'test-token' },
}))

const getMock = jest.fn()
jest.mock('axios', () => ({ __esModule: true, default: { get: (...args: unknown[]) => getMock(...args) } }))

import { listarAsUltimasFeatures, DiscordChannel } from '../../../../src/services/github/GithubService'

function fakeChannel() {
  const sent: string[] = []
  const channel: DiscordChannel = {
    send: jest.fn(async (text: string) => {
      sent.push(text)
      return { delete: jest.fn() }
    }),
  }
  return { channel, sent }
}

const commitsResponse = {
  data: [
    { commit: { message: 'feat: primeira' } },
    { commit: { message: 'fix: segunda' } },
    { commit: { message: 'chore: terceira' } },
  ],
}

beforeEach(() => {
  getMock.mockReset()
  jest.useFakeTimers()
})
afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('GithubService.listarAsUltimasFeatures', () => {
  it('chama a URL canônica de commits, sem os placeholders OWNER/REPO', async () => {
    getMock.mockResolvedValueOnce(commitsResponse)
    const { channel } = fakeChannel()

    await listarAsUltimasFeatures(channel)

    const url = getMock.mock.calls[0][0] as string
    expect(url).toBe('https://api.github.com/repos/Jean1dev/agiota-discord-bot/commits')
    expect(url).not.toContain('OWNER')
    expect(url).not.toContain('REPO')
  })

  it('envia o cabeçalho de Authorization quando há token', async () => {
    getMock.mockResolvedValueOnce(commitsResponse)
    const { channel } = fakeChannel()

    await listarAsUltimasFeatures(channel)

    const config = getMock.mock.calls[0][1] as { headers: Record<string, string> }
    expect(config.headers.Authorization).toBe('token test-token')
  })

  it('envia as duas últimas mensagens de commit no canal', async () => {
    getMock.mockResolvedValueOnce(commitsResponse)
    const { channel, sent } = fakeChannel()

    await listarAsUltimasFeatures(channel)

    expect(sent[0]).toBe('Ultimas alterações')
    expect(sent[1]).toBe('feat: primeira\nfix: segunda')
  })

  it('faz retry em falha transitória e tem sucesso na tentativa seguinte', async () => {
    getMock
      .mockRejectedValueOnce(new Error('Premature close'))
      .mockResolvedValueOnce(commitsResponse)
    const { channel, sent } = fakeChannel()

    const promise = listarAsUltimasFeatures(channel)
    await jest.advanceTimersByTimeAsync(2000) // espera o backoff da 1ª tentativa
    await promise

    expect(getMock).toHaveBeenCalledTimes(2)
    expect(sent[1]).toBe('feat: primeira\nfix: segunda')
  })

  it('não derruba o processo se todas as tentativas falharem', async () => {
    getMock.mockRejectedValue(new Error('Premature close'))
    const { channel, sent } = fakeChannel()

    const promise = listarAsUltimasFeatures(channel)
    await jest.advanceTimersByTimeAsync(10_000)
    await expect(promise).resolves.toBeUndefined()
    expect(sent).toHaveLength(0)
  })
})
