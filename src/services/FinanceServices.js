const context = require('../context').contextInstance
const { MessageEmbed } = require("discord.js")
const { FINANCE_API_AUTH } = require('../config')
const captureException = require('../observability/Sentry')
const axios = require('axios')
const { CAIXINHA_CHANNEL } = require('../discord-constants')

const MAX_RETRY_TENTATIVES = 10

const apiCall = axios.create({
    baseURL: 'https://caixinha-financeira-9a2031b303cc.herokuapp.com',
    timeout: 40000,
    headers: {
        'X-API-KEY': FINANCE_API_AUTH,
        'client-info': 'discord-bot'
    }
})

function getChannelCaixinha() {
    return context().client.channels.cache.find(channel => channel.name === CAIXINHA_CHANNEL)
}

function handleAxiosException(e) {
    if (e.isAxiosError) {
        const _channel = getChannelCaixinha()
        
        if (e.response.status === 406) {
            _channel.send(`Banco fora do horario de operacao`)
            _channel.send(`Horario permitido seg~sex das 09am ~ 19pm`)
            return
        }

        _channel.send(JSON.stringify(e.toJSON()))
    }

    captureException(e)
}

function verificarStatus(key, tentative = 0) {
    apiCall.get(`pix/${key}`)
        .then(({ data }) => {
            const statusPix = data.statusPix
            if (statusPix === 'EM_PROCESSAMENTO') {
                if (tentative >= MAX_RETRY_TENTATIVES) {
                    getChannelCaixinha().send(`Nao foi possivel processar o pix ${key} excedeu numero maximo de tentativas`)
                    return
                }

                tentative++
                setTimeout(() => {
                    verificarStatus(key, tentative)
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
        valor: contract.valor.toFixed(2)
    }).then(({ data }) => {
        const key = data.key
        getChannelCaixinha().send(`Solicitando de Pix R$${contract.valor} para ${contract.favorecido} - chave ${contract.pix} `)
        verificarStatus(key)
    }).catch(handleAxiosException)
}

function cobrancaImediata(contract) {
    const channel = getChannelCaixinha()

    apiCall.post('/cob', {
        descricaoItem: `Pagamento emprestimo ${contract.nome}`,
        valorItem: contract.valor.toFixed(2),
        mensagem: "cobranca imediata"
    }).then(({ data }) => {
        const { paymentUrl } = data
        const embed = new MessageEmbed()
            .setTitle(`Cobranca imedieta para ${contract.nome} - ${contract.cpf}`)
            .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjUjtI3p1UZWNBBJHMDd9nqDjPIKQemaFDGg&usqp=CAU')
            .setDescription(`
                    pague atraves do link ${paymentUrl}
                `).setColor("RANDOM")

        channel.send({ embeds: [embed] })
    }).catch(handleAxiosException)

    apiCall.post('pix/criar-cobranca', {
        devedorCPF: contract.cpf,
        chavePix: "ec7ef5dc-7f1a-4690-a8e8-88da9184fe49",
        devedorNome: contract.nome,
        descricaoSolicitacao: "cobranca imediata",
        valor: contract.valor.toFixed(2)
    }).then(({ data }) => {
        const { qrCode, txId } = data
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
    switch (message.subtype) {
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