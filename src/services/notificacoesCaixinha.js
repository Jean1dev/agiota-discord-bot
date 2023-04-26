const { client: MongoClient, DATABASE } = require('../repository/mongodb')
const context = require('../context')
const { MessageEmbed } = require("discord.js")
const { ObjectID } = require('mongodb')

const state = {
    intervalSchedulerRef: null,
    mongoClient: null
}

async function connectDBAndKeepOpen() {
    state.mongoClient = await MongoClient.connect()
}

async function closeConnection() {
    await state.mongoClient.close()
}

async function startSearching() {
    await connectDBAndKeepOpen()
    state.intervalSchedulerRef = setInterval(async () => {
        console.log('searching for new loans')
        const data = await state.mongoClient.db(DATABASE).collection('SolicitacaoEmprestimo').find({ discordVerify: { $exists: false } }).toArray()

        if (data.length) {
            const channel = context.client.channels.cache.find(channel => channel.name === '💰-caixinha')
            for (const element of data) {
                const embed = new MessageEmbed()
                    .setTitle(`'Solicitação de emprestimo' do ${element.memberName}`)
                    .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
                    .setDescription(`
                                valor R$${element.valor} \n
                                o juros pago sera de ${element.juros}% \n
                                a quantidade de parcelas sera ${element.parcela} \n
                                no total de de R$${element.total} \n
                                ${element.motivo} \n
                    `).setColor("RANDOM")

                channel.send({ embeds: [embed] })
                await state.mongoClient.db(DATABASE).collection('SolicitacaoEmprestimo').updateOne(
                    { _id: new ObjectID(element._id) },
                    { $set: { discordVerify: true } }
                )
            }

            closeConnection().finally(() => {
                clearInterval(state.intervalSchedulerRef)
            })

        }

    }, 30000)
}

module.exports = {
    startSearching
}