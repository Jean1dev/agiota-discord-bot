const context = require('../context')
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js")
const captureException = require('../observability/Sentry')

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
    const channel = getChannelCaixinha()
    const embed = new MessageEmbed()
        .setTitle(`nova solicitação de emprestimo do ${emprestimo.memberName}`)
        .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
        .setDescription(`
                        valor solicitado R$${emprestimo.valueRequested.value} \n
                        com um juros de ${emprestimo.interest.value}% \n
                        valor total da soliticação R$${emprestimo.totalValue.value}
                        ${emprestimo.description} \n
            `).setColor("RANDOM")

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

    channel.send({ embeds: [embed], components: [actionRow] })
        .then(sentMessage => {
            const collector = sentMessage.createMessageComponentCollector();

            collector.on('collect', (interaction) => {
                if (interaction.customId === 'aprovar') {
                    interaction.reply(`Você aceitou ${interaction.member.nickname} `);
                } else if (interaction.customId === 'rejeitar') {
                    interaction.reply(`Você rejeitou ${interaction.member.nickname}`);
                }
            });
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