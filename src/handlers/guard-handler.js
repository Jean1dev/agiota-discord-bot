const { JEANLUCAFP_NICK } = require("../utils/discord-nicks-default")

function requireAdmin(...args) {
    let discordMessage, discordArgs, nextFunction
    if (args.length === 3) {
        discordArgs = args[0]
        discordMessage = args[1]
        nextFunction = args[2]
    } else {
        discordMessage = args[0]
        nextFunction = args[1]
    }

    const myName = discordMessage.author.username
    if (myName !== JEANLUCAFP_NICK) {
        discordMessage.reply("Você não tem permissão para executar esse comando")
        return
    }

    discordArgs !== undefined
        ? nextFunction(args, discordMessage)
        : nextFunction(discordMessage)
}

module.exports = {
    requireAdmin
}