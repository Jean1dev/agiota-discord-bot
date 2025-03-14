/** docs github api
 * https://docs.github.com/en/rest/commits/commits
 */
const { Octokit } = require("@octokit/core")
const captureException = require('../observability/Sentry')
const { GITHUB_API_TOKEN } = require('../config')

const TIMEOUT = 45000

function listarAsUltimasFeatures(discordChannel) {
    const octokit = new Octokit({ auth: GITHUB_API_TOKEN })

    octokit.request('GET /repos/Jean1dev/agiota-discord-bot/commits', {
        owner: 'OWNER',
        repo: 'REPO'
    }).then(response => {
        const items = response.data.map(item => ({
            message: item.commit.message
        }))

        discordChannel.send('Ultimas alterações').then(msg => msg.delete({ timeout: TIMEOUT }))
        const message = [items[0].message, items[1].message].join('\n')

        discordChannel.send(message).then(msg => {
            setTimeout(() => msg.delete({ timeout: TIMEOUT }), TIMEOUT)
        })
        
    }).catch(captureException)
}

module.exports = listarAsUltimasFeatures
