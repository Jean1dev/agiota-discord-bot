const context = require('../context').contextInstance
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const captureException = require('../observability/Sentry')
const axios = require('axios')
const { CAIXINHA_SERVER_URL } = require('../config')
const financeServices = require('./FinanceServices')
const sendEmail = require('./EmailService')

function enviarAprovacao(caixinhaId, emprestimoUid) {
    console.log(`(caixinhaId: ${caixinhaId}, emprestimoUid: ${emprestimoUid})`)
    const url = `${CAIXINHA_SERVER_URL}/discord-aprovar-emprestimo?code=i-x47HUNDu2D5ovECdpSpjFxyXPhm49JmDcIlRdUoFN_AzFu40M8tQ==`
    axios.default.post(url, {
        caixinhaId,
        emprestimoUid
    }).then(() => {
        const data = {
            to: 'jeanlucafp@gmail.com',
            subject: 'Enviado aprovação de emprestimo via discord',
            message: `caixinhaId: ${caixinhaId}  emprestimoUid:${emprestimoUid}`
        }
        sendEmail(data)

    }).catch(captureException)
}

function getChannelCaixinha() {
    if (process.env.NODE_ENV === 'dev') {
        return context().client.channels.cache.find(channel => channel.name === 'lixo')    
    }

    return context().client.channels.cache.find(channel => channel.name === '💰-caixinha')
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
                interaction.reply(`Você aceitou ${interaction.member.nickname} `);
                enviarAprovacao(caixinhaId, emprestimoUid)
            } else if (interaction.customId === 'rejeitar') {
                interaction.reply(`Você rejeitou ${interaction.member.nickname}`);
            }
        });
    }

    channel.send({ embeds: [embed], components: [actionRow] })
        .then(sentMessage => {
            onInteraction(sentMessage, caixinhaId, emprestimoUid)
        })
}

function notifyRendimento(message) {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`Atenção`)
        .setThumbnail('https://cdn.icon-icons.com/icons2/3253/PNG/512/income_money_dollar_upward_green_arrow_gain_appreciation_icon_205133.png')
        .setDescription(message).setColor("RANDOM")

    channel.send({ embeds: [embed] })
}

function notifyEmail({ message, remetentes }) {
    remetentes.forEach(email => {
        const data = {
            to: email,
            subject: 'Notificação Caixinha',
            message
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
    notificar
}