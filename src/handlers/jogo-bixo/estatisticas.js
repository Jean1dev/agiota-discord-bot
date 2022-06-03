const { client: MongoClient, DATABASE } = require('../../repository/mongodb')

function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(
            currentValue
        )
        return result;
    }, {})
}

function findTop3(animaisVencedoresAgrupados) {
    const resultado = Object.entries(animaisVencedoresAgrupados)
        .map(item => ({
            bixo: item[0],
            quantidade: item[1].length
        }))
        .sort((valor1, valor2) => {
            if (valor1.quantidade > valor2.quantidade) {
                return 1
            }

            if (valor1.quantidade < valor2.quantidade) {
                return -1
            }

            return 0
        }).reverse()


    return {
        primeiro: resultado[0],
        segundo: resultado[1],
        terceiro: resultado[2]
    }
}

function gerarEstatisticas(callback = () => { }) {
    MongoClient.connect().then(client => {

        client.db(DATABASE).collection('jogo_bixo_registros').find({}).toArray()
            .then(documents => {
                const totalElements = documents.length
                const workCollection = documents.map(item => ({
                    bichoNome: item.vencedor.bichoVencedor.nome,
                    bichoVencedor: item.vencedor.bichoVencedor,
                    vencedor: item.vencedor.apostadorVencedor,
                    apostas: item.apostas
                }))

                const resultGrouped = groupBy(workCollection, 'bichoNome')
                const top3 = findTop3(resultGrouped)

                client.close().then(() => {
                    callback(totalElements, top3)
                })

            })
            .catch(_reject => console.error('gerarEstatisticas::error', _reject.message))

    }).catch(() => console.error('gerarEstatisticas::error'))
}

module.exports = (message) => {
    function exibirResultados(totalElements, top3) {
        message.channel.send(`Total de jogos até hoje ${totalElements}`)
        message.channel.send(`---------------Top 3 animais vencedores----------- `)
        message.channel.send(`1° ${top3.primeiro.bixo} quantidade de jogos ganhos ${top3.primeiro.quantidade}`)
        message.channel.send(`2° ${top3.segundo.bixo} quantidade de jogos ganhos ${top3.segundo.quantidade}`)
        message.channel.send(`3° ${top3.terceiro.bixo} quantidade de jogos ganhos ${top3.terceiro.quantidade}`)
    }

    gerarEstatisticas(exibirResultados)
}