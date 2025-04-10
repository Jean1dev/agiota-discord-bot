const { forceArbitrage } = require("../../services")

module.exports = (args, message) => {
    const quantities = args[0]
    forceArbitrage(quantities, (response) => {
        message.reply(response)
    })
}