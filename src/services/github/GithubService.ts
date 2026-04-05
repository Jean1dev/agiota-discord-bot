import { Octokit } from '@octokit/core'
import { env } from '../../config/env'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('GithubService')

const TIMEOUT = 45_000

export interface DiscordChannel {
  send(text: string): Promise<{ delete(opts: { timeout: number }): void }>
}

export async function listarAsUltimasFeatures(discordChannel: DiscordChannel): Promise<void> {
  const octokit = new Octokit({ auth: env.GITHUB_API_TOKEN })

  try {
    const response = await octokit.request('GET /repos/Jean1dev/agiota-discord-bot/commits', {
      owner: 'OWNER',
      repo: 'REPO',
    })

    const [first, second] = response.data.map((item: { commit: { message: string } }) => item.commit.message)
    const message = [first, second].filter(Boolean).join('\n')

    const header = await discordChannel.send('Ultimas alterações')
    header.delete({ timeout: TIMEOUT })

    const body = await discordChannel.send(message)
    setTimeout(() => body.delete({ timeout: TIMEOUT }), TIMEOUT)
  } catch (err) {
    log.error({ err }, 'failed to list github commits')
  }
}
