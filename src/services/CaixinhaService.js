const context = require('../context')
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const captureException = require('../observability/Sentry')
const axios = require('axios')
const { CAIXINHA_SERVER_URL, BASIC_MAILGUN_KEY } = require('../config')
const FormData = require("form-data")

function enviarAprovacao(caixinhaId, emprestimoUid) {
    axios.default.post(CAIXINHA_SERVER_URL, {
        caixinhaId,
        emprestimoUid
    }).then(() => {
        const form = new FormData()
        form.append('from', 'Binno apps <equipe@central.binnoapp.com>')
        form.append('to', 'jeanlucafp@gmail.com')
        form.append('subject', 'Enviado aprovação de emprestimo via discord')
        form.append('text', `caixinhaId: ${caixinhaId}  emprestimoUid:${emprestimoUid}`)

        axios({
            method: 'post',
            url: 'https://api.mailgun.net/v3/central.binnoapp.com/messages',
            data: form,
            headers: { Authorization: `Basic ${BASIC_MAILGUN_KEY}`, ...form.getHeaders() }
        }).catch(captureException)

    }).catch(captureException)
}

function getChannelCaixinha() {
    return context.client.channels.cache.find(channel => channel.name === '💰-caixinha')
}

function notifyDeposito(deposito) {
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`Novo deposito do ${deposito.memberName}`)
        .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
        .setDescription(`
                        valor R$${deposito.value.value} \n
            `).setColor("RANDOM")

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

    const caixinhaId = emprestimo._id
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
        .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
        .setDescription(message).setColor("RANDOM")

    channel.send({ embeds: [embed] })
}

function notifyEmail({ message, remetentes }) {

    remetentes.forEach(email => {
        const form = new FormData()
        form.append('from', 'Binno apps <equipe@central.binnoapp.com>')
        form.append('to', email)
        form.append('subject', 'Notificação Caixinha')
        form.append('text', message)

        axios({
            method: 'post',
            url: 'https://api.mailgun.net/v3/central.binnoapp.com/messages',
            data: form,
            headers: { Authorization: `Basic ${BASIC_MAILGUN_KEY}`, ...form.getHeaders() }
        }).catch(captureException)
        
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

            case 'EMAIL':
                notifyEmail(jsonMessage.data)
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