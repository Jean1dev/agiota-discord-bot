const { myDailyBudgetService } = require('../../services')
const { JEANLUCAFP_NICK } = require('../../utils/discord-nicks-default')

module.exports = async (args, message) => {
    const myName = message.author.username
    if (myName !== JEANLUCAFP_NICK) {
        return
    }

    const money = args[0]
    const balance = myDailyBudgetService.addMoneyToDailyBudget(Number(money))
    message.reply(`new balance ${balance.toFixed(2)}`)
}