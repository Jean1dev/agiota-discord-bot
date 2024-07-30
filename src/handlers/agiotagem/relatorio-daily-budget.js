const sendEmail = require("../../services/EmailService")
const { gerarRelatorioFechamentoCompentencia } = require("../../services/myDailyBudget")
const { JEANLUCAFP_NICK } = require("../../utils/discord-nicks-default")

function displayAs3Ultimas(result, message) {
    const last3 = result.slice(-3)
    last3.forEach((element) => {
        message.reply(element)
    })
}

module.exports = async message => {
    const myName = message.author.username
    if (myName !== JEANLUCAFP_NICK) {
        return
    }

    gerarRelatorioFechamentoCompentencia()
        .then(result => {
            if (result && result.length > 0) {
                displayAs3Ultimas(result, message)

                result.forEach((element, index) => {
                    sendEmail({
                        subject: `Relatorio de despesas ${index}`,
                        message: element,
                        to: 'jeanlucafp@gmail.com'
                    })
                })

                return
            }

            message.reply("Não há dados para o relatorio mensal")
        })
}