const { client: MongoClient } = require('../repository/mongodb')
const context = require('../context')
const { MessageEmbed } = require("discord.js")
const { ObjectID } = require('mongodb')

const DATABASE = 'caixinha'
const collectionName = 'emprestimos'

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
        const data = await state.mongoClient.db(DATABASE).collection(collectionName).find({ discordVerify: { $exists: false } }).toArray()

        if (data.length) {
            const channel = context.client.channels.cache.find(channel => channel.name === '💰-caixinha')
            for (const element of data) {
                const embed = new MessageEmbed()
                    .setTitle(`'Solicitação de emprestimo' do ${element.memberName}`)
                    .setThumbnail('https://play-lh.googleusercontent.com/zz-I1flXxoU24si5lu4hpUMEGWDLfT5Leyvg5skcV2GQiTkqEBiTtNxU81v8aOK8Y5U')
                    .setDescription(`
                                valor R$${element.valueRequested} \n
                                o juros pago sera de ${element.interest}% \n
                                a quantidade de parcelas sera ${0} \n
                                no total de de R$${element.totalValue} \n
                                ${element.description} \n
                    `).setColor("RANDOM")

                channel.send({ embeds: [embed] })
                await state.mongoClient.db(DATABASE).collection(collectionName).updateOne(
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