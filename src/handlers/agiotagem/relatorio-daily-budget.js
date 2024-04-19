const sendEmail = require("../../services/EmailService")
const { gerarRelatorioFechamentoCompentencia } = require("../../services/myDailyBudget")
const { JEANLUCAFP_NICK } = require("../../utils/discord-nicks-default")

module.exports = async message => {
    const myName = message.author.username
    if (myName !== JEANLUCAFP_NICK) {
        return
    }

    gerarRelatorioFechamentoCompentencia()
        .then(result => {
            if (result && result.length > 0) {
                result.forEach((element, index) => {
                    message.reply(element)

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