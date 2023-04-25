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
            data.forEach(element => {
                const embed = new MessageEmbed()
                    .setTitle(`'Solicitação de emprestimo' do ${element.memberName}`)
                    .setThumbnail('https://avatars.githubusercontent.com/u/17297009?v=4')
                    .setDescription(`
                valor R$${element.valor} \n
                o juros pago sera de ${element.juros}% \n
                a quantidade de parcelas sera ${element.parcela} \n
                no total de de 4544 \n
                ${element.motivo} \n
            `)
                    .setColor("RANDOM")

                channel.send({ embeds: [embed] })
                state.mongoClient.db(DATABASE).collection('SolicitacaoEmprestimo').updateOne(
                    { _id: new ObjectID(element._id) },
                    { $set: { discordVerify: true } }
                )


            })

        }

    }, 30000)
}

module.exports = {
    startSearching
}