const { myDailyBudgetService } = require('../../services')
const { requireAdmin } = require('../guard-handler')

function handle(args, message) {
    const money = args[0]
    const balance = myDailyBudgetService.addMoneyToDailyBudget(Number(money))
    message.reply(`new balance ${balance.toFixed(2)}`)
}

module.exports = async (args, message) => requireAdmin(args, message, handle)