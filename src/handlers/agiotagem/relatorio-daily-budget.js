const sendEmail = require("../../services/EmailService")
const { gerarRelatorioFechamentoCompentencia } = require("../../services/myDailyBudget")

module.exports = async message => {
    gerarRelatorioFechamentoCompentencia()
        .then(result => {
            if (result && result.length > 0) {
                const conteudo = result.join("\n")
                message.reply(conteudo)

                sendEmail({
                    subject: "Relatorio Mensal de gastos",
                    message: conteudo,
                    to: 'jeanlucafp@gmail.com'
                })

                return
            }

            message.reply("Não há dados para o relatorio mensal")
        })
}