const { criarPDFRetornarCaminho } = require("../../services")
const sendEmail = require("../../services/EmailService")
const { gerarRelatorioFechamentoCompentencia } = require("../../services/myDailyBudget")
const upload = require("../../services/UploadService")
const { sleep } = require("../../utils/utils")
const { requireAdmin } = require("../guard-handler")

function displayAs3Ultimas(result, message) {
    const last3 = result.slice(-3)
    last3.forEach((element) => {
        message.reply(element)
    })
}

function gerarRelatorioPdf(items) {
    const path = criarPDFRetornarCaminho(items, 'Relatorio de despesas')
    sleep(1000)
        .then(() => {
            upload(path)
                .then((url) => {
                    const email = {
                        to: 'jeanlucafp@gmail.com',
                        subject: 'Relatorio de despesas',
                        message: 'Segue em anexo ',
                        attachmentLink: url
                    }

                    sendEmail(email)
                })
        })
}

function handler(discordMessage) {
    gerarRelatorioFechamentoCompentencia()
        .then(result => {
            if (result && result.length > 0) {
                displayAs3Ultimas(result, discordMessage)
                gerarRelatorioPdf(result)

                return
            }

            discordMessage.reply("Não há dados para o relatorio mensal")
        })
}

module.exports = async message => requireAdmin(message, handler)