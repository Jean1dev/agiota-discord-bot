/** docs github api
 * https://docs.github.com/en/rest/commits/commits
 */
const { Octokit } = require("@octokit/core")
const captureException = require('../observability/Sentry')

function listarAsUltimasFeatures(discordChannel) {
    const octokit = new Octokit({ auth: `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` })

    octokit.request('GET /repos/Jean1dev/agiota-discord-bot/commits', {
        owner: 'OWNER',
        repo: 'REPO'
    }).then(response => {
        const items = response.data.map(item => ({
            message: item.commit.message
        }))

        discordChannel.send('Ultimas alterações')
        for (let index = 0; index < 1; index++) {
            discordChannel.send(items[index])
        }
        
    }).catch(captureException)
}

module.exports = listarAsUltimasFeatures