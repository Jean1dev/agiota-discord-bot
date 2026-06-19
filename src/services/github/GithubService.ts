import axios from 'axios'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('GithubService')

const TIMEOUT = 45_000
const COMMITS_URL = 'https://api.github.com/repos/Jean1dev/agiota-discord-bot/commits'
const MAX_RETRIES = 2

export interface DiscordChannel {
  send(text: string): Promise<{ delete(opts: { timeout: number }): void }>
}

interface GithubCommit {
  commit: { message: string }
}

async function fetchUltimosCommits(): Promise<GithubCommit[]> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get<GithubCommit[]>(COMMITS_URL, {
        timeout: 15_000,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'agiota-discord-bot',
          ...(env.GITHUB_API_TOKEN ? { Authorization: `token ${env.GITHUB_API_TOKEN}` } : {}),
        },
      })
      return data
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt))
      }
    }
  }
  throw lastErr
}

export async function listarAsUltimasFeatures(discordChannel: DiscordChannel): Promise<void> {
  try {
    const commits = await fetchUltimosCommits()

    const [first, second] = commits.map(item => item.commit.message)
    const message = [first, second].filter(Boolean).join('\n')

    const header = await discordChannel.send('Ultimas alterações')
    header.delete({ timeout: TIMEOUT })

    const body = await discordChannel.send(message)
    setTimeout(() => body.delete({ timeout: TIMEOUT }), TIMEOUT)
  } catch (err) {
    log.error({ err }, 'failed to list github commits')
  }
}
