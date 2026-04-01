import axios from 'axios'
import { MessageEmbed, MessageButton, MessageActionRow } from 'discord.js'
import captureException from '../../observability/Sentry'
import { CAIXINHA_CHANNEL, LIXO_CHANNEL } from '../../discord/DiscordConstants'
import { sendEmail } from '../email/EmailService'
import { addSubcriptionByEvent, addProtestByEvent } from '../subscription/SubscriptionService'
import { forceArbitrage } from '../b3/CryptoArbitrageService'

function getContext() {
    return require('../../context').contextInstance()
}

function getConfig() {
    return require('../../config')
}

function getFinanceService() {
    return require('./FinanceService').default ?? require('./FinanceService')
}

const state = {
    aprovacoes: 0,
    quemAprovou: [] as Array<{ nick: string }>,
    reprovado: false
}

function sendSmsToCaixinhaMembers(message: string): void {
    ;[
        { message, phone: process.env.ARNALDO_NUMBER },
        { message, phone: process.env.ARTHUR_NUMBER },
        { message, phone: process.env.AUGUSTO_NUMBER }
    ].forEach(it => {
        notifySms(it)
    })
}

async function notifySms(payload: { message: string; phone?: string }): Promise<void> {
    const { message, phone } = payload
    const baseUrl = `${getConfig().COMMUNICATION_SERVER_URL}/notificacao`

    try {
        if (phone) {
            const response = await axios.post(`${baseUrl}/sms`, {
                desc: message,
                recipients: [phone]
            })
            console.log(response.data)
            return
        }

        const response = await axios.post(baseUrl, {
            types: ['sms'],
            desc: message,
            user: 'jeanlucafp@gmail.com'
        })
        console.log(response.data)
    } catch (error) {
        captureException(error)
    }
}

export async function getInfoUltimoEmprestimo(
    username: string
): Promise<{ error?: string; text?: string; link?: string }> {
    const dePara: Record<string, { name: string; email: string }> = {
        jeanlucafp: { name: 'Jeanluca FP', email: 'jeanlucafp@gmail.com' },
        augustosavi: { name: 'Augusto Savi', email: 'guto_savi@outlook.com' },
        ursodepilado: { name: 'Arnaldo Pagani Junior', email: 'dinhupagani@gmail.com' }
    }

    const user = dePara[username]
    if (!user) {
        return {
            error: `Usuario ${username} não mapeado discord x caixinha, acesse o link https://caixinha-gilt.vercel.app/meus-emprestimos `
        }
    }

    const url = `${getConfig().CAIXINHA_SERVER_URL}/get-ultimo-emprestimo-pendente?email=${user.email}&name=${user.name}`
    const response = await axios.get(url)
    const data = response.data
    if (data.error || !data?.exists) {
        return { error: data.error || 'Nenhum emprestimo pendente' }
    }

    const link = `https://caixinha-gilt.vercel.app/detalhes-emprestimo?uid=${data.data.uid}`
    let text = `R$${data.data.totalValue.value}  valor total solicitado\n`
    if (data.data.billingDates.length > 0) {
        text += `Parcelado em ${data.data.installments}x \n`
        text += `Valor esperado para a parcela R$${data.data.totalValue.value / data.data.installments} \n`
    }

    return { text, link }
}

function enviarAprovacao(caixinhaId: string, emprestimoUid: string): void {
    const url = `${getConfig().CAIXINHA_SERVER_URL}/discord-aprovar-emprestimo?code=ZE1oGnOPHdf4QtEvPpILx97EPHvdjmpw9wbE9P4bvmr6AzFuIbaQtQ==`
    axios
        .post(url, { caixinhaId, emprestimoUid })
        .then(() => {
            sendEmail({
                to: 'jeanlucafp@gmail.com',
                subject: 'Enviado aprovação de emprestimo via discord',
                body: `caixinhaId: ${caixinhaId}  emprestimoUid:${emprestimoUid}`
            })
        })
        .catch(captureException)
}

function reprovarEmprestimo(interaction: any, emprestimoUid: string): void {
    const nick = interaction.member.user.username
    const url = `https://caixinha-gilt.vercel.app/detalhes-emprestimo?uid=${emprestimoUid}`
    interaction.reply(`${nick} para continuar a rejeicao \n\n        acesse o link ${url} \n\n        e informe o motivo`)
    state.reprovado = true
}

function adicionarAprovacao(interaction: any, caixinhaId: string, emprestimoUid: string): void {
    const nick = interaction.member.user.username
    const find = state.quemAprovou.find(it => it.nick === nick)
    if (find) {
        interaction.reply(`${nick} voce ja aceitou`)
        return
    }

    if (state.reprovado) {
        interaction.reply('Esse emprestimo foi rejeitado')
        return
    }

    state.aprovacoes++
    state.quemAprovou.push({ nick })
    interaction.reply(`${nick} Aceitou esse emprestimo`)

    if (state.aprovacoes >= 2) {
        enviarAprovacao(caixinhaId, emprestimoUid)
    }
}

function getChannelCaixinha(): any {
    if (process.env.NODE_ENV === 'dev') {
        return getContext().client.channels.cache.find(
            (channel: any) => channel.name === LIXO_CHANNEL
        )
    }
    return getContext().client.channels.cache.find(
        (channel: any) => channel.name === CAIXINHA_CHANNEL
    )
}

function notifyDeposito(deposito: any): void {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`Novo deposito do ${deposito.memberName}`)
        .setThumbnail(
            'https://img.freepik.com/vetores-premium/icone-plano-de-deposito-elemento-simples-de-cor-da-colecao-fintech-icone-de-deposito-criativo-para-infograficos-de-modelos-de-web-design-e-muito-mais_676904-971.jpg?w=2000'
        )
        .setDescription(`valor R$${deposito.value.value} \n`)
        .setColor('RANDOM')

    if (deposito.image) {
        embed.setImage(deposito.image)
    }

    channel.send({ embeds: [embed] })
    sendSmsToCaixinhaMembers(`Novo deposito do ${deposito.memberName}, acesse no discord`)
}

function notifyEmprestimo(emprestimo: any): void {
    function getDataFormatada(dataString: string): string {
        const data = new Date(dataString)
        const dia = String(data.getDate()).padStart(2, '0')
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const ano = data.getFullYear()
        return `${dia}/${mes}/${ano}`
    }

    function getDescription(): string {
        if (emprestimo.installments > 0) {
            return `
            valor solicitado R$${emprestimo.valueRequested.value} \n
            com um juros de ${emprestimo.interest.value}% \n
            valor total da soliticação R$${emprestimo.totalValue.value}
            ${emprestimo.description} \n
            esse é um emprestimo parcelado em ${emprestimo.installments}x \n
            data da primeira parcela é ${getDataFormatada(emprestimo.billingDates[0])}
            `
        } else {
            return `
            valor solicitado R$${emprestimo.valueRequested.value} \n
            com um juros de ${emprestimo.interest.value}% \n
            valor total da soliticação R$${emprestimo.totalValue.value}
            ${emprestimo.description} \n
            data limite de pagamento é ${getDataFormatada(emprestimo.billingDates[0])}
            `
        }
    }

    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`nova solicitação de emprestimo do ${emprestimo.memberName}`)
        .setThumbnail(
            'https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U'
        )
        .setDescription(getDescription())
        .setColor('RANDOM')

    const aceitarButton = new MessageButton()
        .setCustomId('aprovar')
        .setLabel('aprovar')
        .setStyle('SUCCESS')

    const rejeitarButton = new MessageButton()
        .setCustomId('rejeitar')
        .setLabel('Rejeitar')
        .setStyle('DANGER')

    const actionRow = new MessageActionRow().addComponents(aceitarButton, rejeitarButton)

    const caixinhaId = emprestimo.boxId
    const emprestimoUid = emprestimo.uid

    channel.send({ embeds: [embed], components: [actionRow] }).then((sentMessage: any) => {
        const collector = sentMessage.createMessageComponentCollector()

        collector.on('collect', (interaction: any) => {
            if (interaction.customId === 'aprovar') {
                adicionarAprovacao(interaction, caixinhaId, emprestimoUid)
            } else if (interaction.customId === 'rejeitar') {
                reprovarEmprestimo(interaction, emprestimoUid)
            }
        })
    })

    sendSmsToCaixinhaMembers(
        `Novo emprestimo solicitado por ${emprestimo.memberName}, acesse o discord`
    )
}

function notifyRendimento(message: string): void {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle('Atenção')
        .setThumbnail(
            'https://cdn.icon-icons.com/icons2/3253/PNG/512/income_money_dollar_upward_green_arrow_gain_appreciation_icon_205133.png'
        )
        .setDescription(message)
        .setColor('RANDOM')

    channel.send({ embeds: [embed] })
}

function notifyEmail(messageInput: any): void {
    messageInput.remetentes.forEach((email: string) => {
        let data: any = {
            to: email,
            subject: 'Notificação Caixinha',
            message: messageInput.message
        }

        if (messageInput.templateCode) {
            data = {
                ...data,
                templateCode: messageInput.templateCode,
                customBodyProps: messageInput.customBodyProps
            }
        }
        sendEmail(data)
    })
}

function emprestimoAprovado(payload: any): void {
    const channel = getChannelCaixinha()
    channel.send(`Emprestimo aprovado para ${payload.memberName}`)
    const url = `${getConfig().CAIXINHA_SERVER_URL}/solicitar-envio-emprestimo`

    axios
        .post(url, {
            caixinhaId: payload.caixinhaid,
            emprestimoUid: payload.emprestimoId
        })
        .then(() => {
            sendEmail({
                to: 'jeanlucafp@gmail.com',
                subject: `Emprestimo do ${payload.memberName} foi aprovado`,
                body: `caixinhaId: ${payload.caixinhaid}  emprestimoUid:${payload.emprestimoId}`
            })
        })
        .catch((e: any) => {
            if (e.isAxiosError) {
                const message = e.response.data.message
                if (
                    message === 'Usuario não tem um perfil criado' ||
                    message === 'Usuario não tem chave pix cadastrada'
                ) {
                    channel.send(
                        `${payload.memberName} tem informacoes incompletas para o envio do PIX`
                    )
                    channel.send(
                        'Acesse https://caixinha-gilt.vercel.app/perfil e preencha os campos de chave pix e telefone'
                    )
                } else if (message) {
                    channel.send(message)
                }
            }
            captureException(e)
        })
}

function userLogged(payload: any): void {
    const appEvents = require('../../app-events')
    appEvents.emit('enviar-mensagem-telegram', `Usuario ${payload.email} logado`)
    forceArbitrage(
        100,
        () => {},
        () => {
            appEvents.emit('enviar-mensagem-telegram', 'Arbitragem concluida')
        }
    )
}

export function notificar(message: string): void {
    try {
        const jsonMessage = JSON.parse(message)
        const financeService = getFinanceService()

        switch (jsonMessage.type) {
            case 'DEPOSITO':
                notifyDeposito(jsonMessage.data)
                break
            case 'EMPRESTIMO':
                notifyEmprestimo(jsonMessage.data)
                break
            case 'RENDIMENTO':
                notifyRendimento(jsonMessage.data)
                break
            case 'NOTIFICACAO':
                notifyRendimento(jsonMessage.data.message)
                break
            case 'EMAIL':
                notifyEmail(jsonMessage.data)
                break
            case 'SMS':
                notifySms(jsonMessage.data)
                break
            case 'FINANCE':
                financeService(jsonMessage)
                break
            case 'EMPRESTIMO_APROVADO':
                emprestimoAprovado(jsonMessage.data)
                break
            case 'SUBSCRIPTION':
                addSubcriptionByEvent(jsonMessage.data)
                break
            case 'PROTEST':
                addProtestByEvent(jsonMessage.data)
                break
            case 'USER_LOGGED':
                userLogged(jsonMessage.data)
                break
            default:
                break
        }
    } catch (error) {
        captureException(error)
    }
}
