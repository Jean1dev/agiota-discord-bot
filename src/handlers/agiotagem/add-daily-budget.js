const { myDailyBudgetService } = require('../../services')

module.exports = async (args, message) => {
    const myName = message.author.username
    if (myName !== 'jeanlucafp') {
        return
    }

    const money = args[0]
    const balance = myDailyBudgetService.addMoneyToDailyBudget(Number(money))
    message.reply(`new balance ${balance.toFixed(2)}`)
}