const { requireAdmin } = require("../guard-handler");
const { createSubscription } = require('../../services/SubscriptionService')

async function handler(args, discordMessage) {
    const email = String(args[0]).replace('mailto:', '')
    const fone = String(args.slice(1).join(' '))

    try {
        const result = await createSubscription(email, fone)
        discordMessage.reply(`Status ${result.status} para criacao do plano`)
    } catch (error) {
        discordMessage.reply(`Erro ao criar o plano: ${error.message}`)
    }
}

module.exports = (args, message) => requireAdmin(args, message, handler)