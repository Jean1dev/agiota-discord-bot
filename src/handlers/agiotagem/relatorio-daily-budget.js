const sendEmail = require("../../services/EmailService")
const { gerarRelatorioFechamentoCompentencia } = require("../../services/myDailyBudget")
const { requireAdmin } = require("../guard-handler")

function displayAs3Ultimas(result, message) {
    const last3 = result.slice(-3)
    last3.forEach((element) => {
        message.reply(element)
    })
}

function handler(discordMessage) {
    gerarRelatorioFechamentoCompentencia()
        .then(result => {
            if (result && result.length > 0) {
                displayAs3Ultimas(result, discordMessage)

                result.forEach((element, index) => {
                    sendEmail({
                        subject: `Relatorio de despesas ${index}`,
                        message: element,
                        to: 'jeanlucafp@gmail.com'
                    })
                })

                return
            }

            discordMessage.reply("Não há dados para o relatorio mensal")
        })
}

module.exports = async message => requireAdmin(message, handler)