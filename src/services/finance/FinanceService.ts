import axios, { AxiosInstance } from 'axios'
import { EmbedBuilder } from 'discord.js'
import { env } from '../../config/env'
import { contextInstance } from '../../context'
import captureException from '../../observability/Sentry'
import { CAIXINHA_CHANNEL } from '../../discord/DiscordConstants'
import { createLogger } from '../../shared/logger/Logger'

const log = createLogger('FinanceService')

const MAX_RETRY_TENTATIVES = 10

function createApiCall(): AxiosInstance {
    return axios.create({
        baseURL: 'https://caixinha-financeira-9a2031b303cc.herokuapp.com',
        timeout: 40000,
        headers: {
            'X-API-KEY': env.FINANCE_API_AUTH,
            'client-info': 'discord-bot'
        }
    })
}

function getChannelCaixinha(): any {
    return contextInstance().client.channels.cache.find(
        (channel: any) => channel.name === CAIXINHA_CHANNEL
    )
}

function handleAxiosException(apiCall: AxiosInstance, e: any): void {
    if (e.isAxiosError) {
        const _channel = getChannelCaixinha()

        if (e.response?.status === 406) {
            _channel.send('Banco fora do horario de operacao')
            _channel.send('Horario permitido seg~sex das 09am ~ 19pm')
            return
        }

        _channel.send(JSON.stringify(e.toJSON()))
    }

    captureException(e)
}

function verificarStatus(key: string, tentative = 0): void {
    const apiCall = createApiCall()
    apiCall
        .get(`pix/${key}`)
        .then(({ data }) => {
            const statusPix = data.statusPix
            if (statusPix === 'EM_PROCESSAMENTO') {
                if (tentative >= MAX_RETRY_TENTATIVES) {
                    getChannelCaixinha().send(
                        `Nao foi possivel processar o pix ${key} excedeu numero maximo de tentativas`
                    )
                    return
                }

                tentative++
                setTimeout(() => {
                    verificarStatus(key, tentative)
                }, 15000)

                return
            }

            const channel = getChannelCaixinha()
            const embed = new EmbedBuilder()
                .setTitle(`Status do pix ${statusPix}`)
                .setThumbnail(
                    'https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U'
                )
                .setDescription(
                    `
                            id ${data.id} \n
                            referenciaTransacaoBancaria ${data.referenciaTransacaoBancaria} \n
                            endToEndId ${data.endToEndId} \n
                            quando ${data.data.quando} \n
                `
                )
                .setColor('Random')

            channel.send({ embeds: [embed] })
        })
        .catch((e) => handleAxiosException(apiCall, e))
}

function sendPix(contract: { valor: number; favorecido: string; pix: string }): void {
    const apiCall = createApiCall()
    apiCall
        .post('pix', {
            chaveFavorecido: 'efipay@sejaefi.com.br',
            chavePagador: 'ec7ef5dc-7f1a-4690-a8e8-88da9184fe49',
            valor: contract.valor.toFixed(2)
        })
        .then(({ data }) => {
            const key = data.key
            getChannelCaixinha().send(
                `Solicitando de Pix R$${contract.valor} para ${contract.favorecido} - chave ${contract.pix} `
            )
            verificarStatus(key)
        })
        .catch((e) => handleAxiosException(apiCall, e))
}

function cobrancaImediata(contract: { nome: string; cpf: string; valor: number }): void {
    const apiCall = createApiCall()
    const channel = getChannelCaixinha()

    apiCall
        .post('/cob', {
            descricaoItem: `Pagamento emprestimo ${contract.nome}`,
            valorItem: contract.valor.toFixed(2),
            mensagem: 'cobranca imediata'
        })
        .then(({ data }) => {
            const { paymentUrl } = data
            const embed = new EmbedBuilder()
                .setTitle(`Cobranca imedieta para ${contract.nome} - ${contract.cpf}`)
                .setThumbnail(
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjUjtI3p1UZWNBBJHMDd9nqDjPIKQemaFDGg&usqp=CAU'
                )
                .setDescription(`pague atraves do link de pagamento ${paymentUrl}`)
                .setColor('Random')

            channel.send({ embeds: [embed] })
        })
        .catch((e) => handleAxiosException(apiCall, e))

    apiCall
        .post('pix/criar-cobranca', {
            devedorCPF: contract.cpf,
            chavePix: 'ec7ef5dc-7f1a-4690-a8e8-88da9184fe49',
            devedorNome: contract.nome,
            descricaoSolicitacao: 'cobranca imediata',
            valor: contract.valor.toFixed(2)
        })
        .then(({ data }) => {
            const { qrCode, txId, pixCopiaECola, chave } = data
            const urlQrCode = 'https://' + qrCode.replace('"', '')
            const embed = new EmbedBuilder()
                .setTitle(`Cobranca imedieta para ${contract.nome} - ${contract.cpf}`)
                .setThumbnail(urlQrCode)
                .setImage(urlQrCode)
                .setDescription(
                    `
                    txId ${txId.replace('"', '')} \n
                    Pix Copia & Cola ${pixCopiaECola} \n
                    chave ${chave} \n
                    pague atraves do link ${urlQrCode} \n
                `
                )
                .setColor('Random')

            channel.send({ embeds: [embed] })
        })
        .catch((e) => handleAxiosException(apiCall, e))
}

export default function handleFinanceMessage(message: { subtype: string; data: any }): void {
    switch (message.subtype) {
        case 'sendPix':
            sendPix(message.data)
            break
        case 'cobrancaImediata':
            cobrancaImediata(message.data)
            break
        default:
            log.warn({ subtype: message.subtype }, 'Nenhuma função mapeada para o subtype')
            break
    }
}
