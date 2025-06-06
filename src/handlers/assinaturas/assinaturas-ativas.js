const { requireAdmin } = require("../guard-handler")
const { getActiveSubscriptions } = require('../../services/SubscriptionService')

async function handler(discordMessage) {
    const subscriptions = await getActiveSubscriptions()
    discordMessage.reply(`Total de assinaturas ativas: ${subscriptions.totalActive}`)
    subscriptions.expiringSoon.forEach(subscription => {
        discordMessage.reply(`${subscription.email} - ${subscription.expiresIn}`)
    })
}

module.exports = (message) => requireAdmin(message, handler)