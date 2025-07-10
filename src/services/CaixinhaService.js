const context = require('../context').contextInstance
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const captureException = require('../observability/Sentry')
const axios = require('axios')
const { CAIXINHA_SERVER_URL, COMMUNICATION_SERVER_URL } = require('../config')
const financeServices = require('./FinanceServices')
const sendEmail = require('./EmailService')
const { CAIXINHA_CHANNEL, LIXO_CHANNEL } = require('../discord-constants')

const state = {
    aprovacoes: 0,
    quemAprovou: [],
    reprovado: false
}

function sendSmsToCaixinhaMembers(message) {
    [{
        message,
        phone: process.env.ARNALDO_NUMBER
    }, {
        message,
        phone: process.env.ARTHUR_NUMBER
    }, {
        message,
        phone: process.env.AUGUSTO_NUMBER
    }].forEach(it => {
        notifySms(it)
    })
}

async function notifySms(payload) {
    const { message, phone } = payload
    const baseUrl = `${COMMUNICATION_SERVER_URL}/notificacao`
    
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

async function getInfoUltimoEmprestimo(username) {
    const dePara = {
        'jeanlucafp': {
            'name': 'Jeanluca FP',
            'email': 'jeanlucafp@gmail.com'
        },
        'augustosavi': {
            'name': 'Augusto Savi',
            'email': 'guto_savi@outlook.com'
        },
        'ursodepilado': {
            'name': 'Arnaldo Pagani Junior',
            'email': 'dinhupagani@gmail.com'
        }
    }

    const user = dePara[username]
    if (!user) {
        return {
            error: `Usuario ${username} não mapeado discord x caixinha, acesse o link https://caixinha-gilt.vercel.app/meus-emprestimos `
        }
    }

    const url = `${CAIXINHA_SERVER_URL}/get-ultimo-emprestimo-pendente?email=${user.email}&name=${user.name}`
    const response = await axios.default.get(url)
    const data = response.data
    if (data.error || !data?.exists) {
        return {
            error: data.error || 'Nenhum emprestimo pendente'
        }
    }

    const link = `https://caixinha-gilt.vercel.app/detalhes-emprestimo?uid=${data.data.uid}`
    let text = `R$${data.data.totalValue.value}  valor total solicitado\n`
    if (data.data.billingDates.length > 0) {
        text += `Parcelado em ${data.data.installments}x \n`
        text += `Valor esperado para a parcela R$${data.data.totalValue.value / data.data.installments} \n`
    }

    return {
        text,
        link
    }
}

function enviarAprovacao(caixinhaId, emprestimoUid) {
    const url = `${CAIXINHA_SERVER_URL}/discord-aprovar-emprestimo?code=i-x47HUNDu2D5ovECdpSpjFxyXPhm49JmDcIlRdUoFN_AzFu40M8tQ==`
    axios.default.post(url, {
        caixinhaId,
        emprestimoUid
    }).then(() => {
        sendEmail({
            to: 'jeanlucafp@gmail.com',
            subject: 'Enviado aprovação de emprestimo via discord',
            message: `caixinhaId: ${caixinhaId}  emprestimoUid:${emprestimoUid}`
        })

    }).catch(captureException)
}

function reprovarEmprestimo(interaction, emprestimoUid) {
    const nick = interaction.member.user.username
    const url = `https://caixinha-gilt.vercel.app/detalhes-emprestimo?uid=${emprestimoUid}`
    interaction.reply(`${nick} para continuar a rejeicao \n
        acesse o link ${url} \n
        e informe o motivo`);

    state.reprovado = true
}

function adicionarAprovacao(interaction, caixinhaId, emprestimoUid) {
    const nick = interaction.member.user.username
    const find = state.quemAprovou.find(it => it.nick === nick)
    if (find) {
        interaction.reply(`${nick} voce ja aceitou`);
        return
    }

    if (state.reprovado) {
        interaction.reply(`Esse emprestimo foi rejeitado`);
        return
    }

    state.aprovacoes++
    state.quemAprovou.push({ nick })
    interaction.reply(`${nick} Aceitou esse emprestimo`);

    if (state.aprovacoes >= 2) {
        enviarAprovacao(caixinhaId, emprestimoUid)
    }
}

function getChannelCaixinha() {
    if (process.env.NODE_ENV === 'dev') {
        return context().client.channels.cache.find(channel => channel.name === LIXO_CHANNEL)
    }

    return context().client.channels.cache.find(channel => channel.name === CAIXINHA_CHANNEL)
}

function notifyDeposito(deposito) {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`Novo deposito do ${deposito.memberName}`)
        .setThumbnail('https://img.freepik.com/vetores-premium/icone-plano-de-deposito-elemento-simples-de-cor-da-colecao-fintech-icone-de-deposito-criativo-para-infograficos-de-modelos-de-web-design-e-muito-mais_676904-971.jpg?w=2000')
        .setDescription(`
                        valor R$${deposito.value.value} \n
            `).setColor("RANDOM")

    if (deposito.image) {
        embed.setImage(deposito.image)
    }

    channel.send({ embeds: [embed] })
    sendSmsToCaixinhaMembers(`Novo deposito do ${deposito.memberName}, acesse no discord`)
}

function notifyEmprestimo(emprestimo) {
    function getDataFormatada(dataString) {
        const data = new Date(dataString);

        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa do zero
        const ano = data.getFullYear();

        const dataFormatada = `${dia}/${mes}/${ano}`;
        return dataFormatada
    }

    function getDescription() {
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
        .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
        .setDescription(getDescription())
        .setColor("RANDOM")

    const aceitarButton = new MessageButton()
        .setCustomId('aprovar')
        .setLabel('aprovar')
        .setStyle('SUCCESS');

    const rejeitarButton = new MessageButton()
        .setCustomId('rejeitar')
        .setLabel('Rejeitar')
        .setStyle('DANGER');

    const actionRow = new MessageActionRow()
        .addComponents(aceitarButton, rejeitarButton);

    const caixinhaId = emprestimo.boxId
    const emprestimoUid = emprestimo.uid

    function onInteraction(sentMessage, caixinhaId, emprestimoUid) {
        const collector = sentMessage.createMessageComponentCollector();

        collector.on('collect', (interaction) => {
            if (interaction.customId === 'aprovar') {
                adicionarAprovacao(interaction, caixinhaId, emprestimoUid)

            } else if (interaction.customId === 'rejeitar') {
                reprovarEmprestimo(interaction, emprestimoUid)
            }
        });
    }

    channel.send({ embeds: [embed], components: [actionRow] })
        .then(sentMessage => {
            onInteraction(sentMessage, caixinhaId, emprestimoUid)
        })

    sendSmsToCaixinhaMembers(`Novo emprestimo solicitado por ${emprestimo.memberName}, acesse o discord`)
}

function notifyRendimento(message) {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`Atenção`)
        .setThumbnail('https://cdn.icon-icons.com/icons2/3253/PNG/512/income_money_dollar_upward_green_arrow_gain_appreciation_icon_205133.png')
        .setDescription(message).setColor("RANDOM")

    channel.send({ embeds: [embed] })
}

function notifyEmail(messageInput) {
    messageInput.remetentes.forEach(email => {
        let data = {
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

function emprestimoAprovado(payload) {
    const channel = getChannelCaixinha()
    channel.send(`Emprestimo aprovado para ${payload.memberName}`)
    const url = `${CAIXINHA_SERVER_URL}/solicitar-envio-emprestimo`

    axios.default.post(url, {
        caixinhaId: payload.caixinhaid,
        emprestimoUid: payload.emprestimoId
    }).then(() => {

        const data = {
            to: 'jeanlucafp@gmail.com',
            subject: `Emprestimo do ${payload.memberName} foi aprovado`,
            message: `caixinhaId: ${payload.caixinhaid}  emprestimoUid:${payload.emprestimoId}`
        }
        sendEmail(data)

    }).catch(e => {
        if (e.isAxiosError) {
            const message = e.response.data.message

            if (message == 'Usuario não tem um perfil criado' || message == 'Usuario não tem chave pix cadastrada') {
                channel.send(`${payload.memberName} tem informacoes incompletas para o envio do PIX`)
                channel.send('Acesse https://caixinha-gilt.vercel.app/perfil e preencha os campos de chave pix e telefone')
            } else if (message) {
                channel.send(message)
            }
        }

        captureException(e)
    })
}

function notificar(message) {
    try {
        const jsonMessage = JSON.parse(message)
        switch (jsonMessage.type) {
            case 'DEPOSITO':
                notifyDeposito(jsonMessage.data)
                break;

            case 'EMPRESTIMO':
                notifyEmprestimo(jsonMessage.data)
                break;

            case 'RENDIMENTO':
                notifyRendimento(jsonMessage.data)
                break;

            case 'NOTIFICACAO':
                notifyRendimento(jsonMessage.data.message)
                break;

            case 'EMAIL':
                notifyEmail(jsonMessage.data)
                break;

            case 'SMS':
                notifySms(jsonMessage.data)
                break;

            case 'FINANCE':
                financeServices(jsonMessage)
                break;

            case 'EMPRESTIMO_APROVADO':
                emprestimoAprovado(jsonMessage.data)
                break;

            default:
                break;
        }
    } catch (error) {
        captureException(error)
        return
    }
}

module.exports = {
    notificar,
    getInfoUltimoEmprestimo
}