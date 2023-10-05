const context = require('../context')
const { MessageEmbed } = require("discord.js")
const { FINANCE_API_AUTH } = require('../config')
const captureException = require('../observability/Sentry')
const axios = require('axios')

const apiCall = axios.create({
    baseURL: 'https://caixinha-financeira-9a2031b303cc.herokuapp.com',
    timeout: 30000,
    headers: {
        'X-API-KEY': FINANCE_API_AUTH,
        'client-info': 'discord-bot'
    }
})

function getChannelCaixinha() {
    return context.client.channels.cache.find(channel => channel.name === 'lixo')
}

function handleAxiosException(e) {
    if (e.isAxiosError) {
        getChannelCaixinha().send(JSON.stringify(e.toJSON()))
    }

    captureException(e)
}

function verificarStatus(key) {
    apiCall.get(`pix/${key}`)
        .then(({ data }) => {
            const statusPix = data.statusPix
            if (statusPix === 'EM_PROCESSAMENTO') {
                setTimeout(() => {
                    verificarStatus(key)
                }, 15000)

                return
            }

            const channel = getChannelCaixinha()
            const embed = new MessageEmbed()
                .setTitle(`Status do pix ${statusPix}`)
                .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
                .setDescription(`
                            id ${data.id} \n
                            referenciaTransacaoBancaria ${data.referenciaTransacaoBancaria} \n
                            endToEndId ${data.endToEndId} \n
                            quando ${data.data.quando} \n
                `).setColor("RANDOM")

            channel.send({ embeds: [embed] })
        }).catch(handleAxiosException)
}

function sendPix(contract) {
    apiCall.post('pix', {
        chaveFavorecido: 'efipay@sejaefi.com.br',
        chavePagador: 'ec7ef5dc-7f1a-4690-a8e8-88da9184fe49',
        valor: contract.valor
    }).then(({ data }) => {
        const key = data.key
        getChannelCaixinha().send(`Pix R$${contract.valor} Enviando para ${contract.favorecido} - chave ${contract.pix}`)
        verificarStatus(key)
    }).catch(handleAxiosException)
}

function cobrancaImediata(contract) {
    apiCall.post('pix/criar-cobranca', {
        devedorCPF: contract.cpf,
        chavePix: "ec7ef5dc-7f1a-4690-a8e8-88da9184fe49",
        devedorNome: contract.nome,
        descricaoSolicitacao: "cobranca imediata",
        valor: contract.valor
    }).then(({ data }) => {
        const { qrCode, txId } = data
        const channel = getChannelCaixinha()
        const urlQrCode = 'https://' + qrCode.replace('\"', '')
        const embed = new MessageEmbed()
            .setTitle(`Cobranca imedieta para ${contract.nome} - ${contract.cpf}`)
            .setThumbnail(urlQrCode)
            .setImage(urlQrCode)
            .setDescription(`
                    txId ${txId.replace('\"', '')} \n
                    se nao carregar o qrCode acesse ${urlQrCode}
                `).setColor("RANDOM")

        channel.send({ embeds: [embed] })
    }).catch(handleAxiosException)
}

module.exports = message => {
    switch(message.subtype) {
        case 'sendPix':
            sendPix(message.data) 
            break;
        case 'cobrancaImediata':
            cobrancaImediata(message.data)
            break;
        default:
            console.log('no function for handle')
            break;
    }
}